export default function Brand({small=false}){
    return <a href="/" className="inline-flex items-center gap-3" aria-label="Cris home">
        <svg width={small?31:39} height={small?31:39} viewBox="0 0 44 44" fill="none" aria-hidden="true"><path d="M5 10Q5 4 11 8L23 18V33Q23 39 17 35L5 25Z" fill="#0D52DB"/><path d="M19 17L33 5Q38 1 41 8V16Q41 19 38 22L23 34V22Z" fill="#36CC72"/><path d="M23 34L37 23V34Q37 37 33 39L23 44L13 37Z" fill="#07183F"/></svg>
        <span className={`${small?'text-2xl':'text-[29px]'} tracking-[-.055em] font-black text-navy`}>Cris<span className="text-azure">.</span></span>
    </a>}
