"""Cris waitlist API. Run: uvicorn main:app --reload"""
from datetime import datetime, timezone
from functools import lru_cache
import logging
import re
import unicodedata

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError, PyMongoError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

log = logging.getLogger('cris.waitlist')

class Settings(BaseSettings):
    mongodb_uri: str
    mongodb_db: str = 'Learn-Like-Leon'
    allowed_origins: str = 'http://localhost:3000'
    redis_url: str = ''
    trust_proxy_headers: bool = False
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

@lru_cache
def settings():
    return Settings()

# Prefer rejecting markup and dangerous control characters over altering valid names or messages.
# MongoDB never executes submitted strings as code or query operators in this implementation.
BAD_TEXT = re.compile(r'[<>`{}\\;]|\b(?:javascript\s*:|data\s*:|onerror\s*=|onload\s*=|select\s+.+\s+from|union\s+select|drop\s+table|insert\s+into|delete\s+from)\b', re.I)
ALLOWED_PUNCT = set(" .,'’()&+-/!?\n\r")

def clean_text(value: str) -> str:
    value = unicodedata.normalize('NFC', value.strip())
    if BAD_TEXT.search(value) or any(not(c.isalnum() or c.isspace() or c in ALLOWED_PUNCT) for c in value):
        raise ValueError('Use plain text without markup or special characters.')
    if any(ord(c) < 32 and c not in '\n\r' for c in value):
        raise ValueError('Control characters are not allowed.')
    return value

class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    company_name: str = Field(min_length=2, max_length=120)
    industry: str
    role: str = Field(default='', max_length=100)
    company_size: str
    message: str = Field(default='', max_length=1000)
    website: str = Field(default='', max_length=200)

    @field_validator('full_name','company_name','role','message')
    @classmethod
    def validate_text(cls, value):
        return clean_text(value)

    @field_validator('industry')
    @classmethod
    def validate_industry(cls, value):
        if value not in ('Healthcare','Education & Childcare','Transportation','Other'):
            raise ValueError('Invalid industry')
        return value

    @field_validator('company_size')
    @classmethod
    def validate_company_size(cls, value):
        if value not in ('1-50','51-200','201-1000','1000+'):
            raise ValueError('Invalid company size')
        return value

    @field_validator('email')
    @classmethod
    def validate_email(cls, value):
        if len(str(value)) > 254:
            raise ValueError('Email too long')
        return value


def remote_ip(request: Request):
    # Uvicorn must be configured with explicit --forwarded-allow-ips at the trusted ingress.
    return request.client.host if request.client else 'unknown'

config = settings()
limiter = Limiter(key_func=remote_ip, default_limits=[], storage_uri=config.redis_url or 'memory://')
app = FastAPI(title='Cris Waitlist API', version='1.0.0', docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: JSONResponse(status_code=429, content={'detail':'Too many submissions. Please try again later.'}))
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=[s.strip() for s in config.allowed_origins.split(',') if s.strip()], allow_methods=['POST','GET'], allow_headers=['Content-Type'], allow_credentials=False)

client = MongoClient(config.mongodb_uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
collection = client[config.mongodb_db]['waitlist']

@app.on_event('startup')
def create_indexes():
    collection.create_index([('email', ASCENDING)], unique=True, name='unique_email')
    collection.create_index('created_at', name='created_at')

@app.get('/health')
def health():
    return {'status':'ok'}

@app.post('/api/v1/waitlist', status_code=201)
@limiter.limit('5/hour')
def join_waitlist(request: Request, entry: WaitlistEntry):
    # Honeypot: avoid revealing detection details to automated submitters.
    if entry.website:
        return {'message':'Thank you for your interest.'}
    doc = entry.model_dump(exclude={'website'})
    doc['email'] = str(entry.email).lower()
    doc['created_at'] = datetime.now(timezone.utc)
    doc['source'] = 'landing_page'
    try:
        collection.insert_one(doc)
    except DuplicateKeyError:
        # Idempotent outward message avoids email enumeration.
        return {'message':'Thank you! If you are not already registered, you have joined the waitlist.'}
    except PyMongoError:
        log.exception('Waitlist database write failed')
        raise HTTPException(status_code=503, detail='Service temporarily unavailable. Please try again later.')
    return {'message':"You're on the list! We'll share updates when they're available."}
