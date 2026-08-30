interface Props {
  className?: string;
}

export function HappyDogLogo({ className = 'text-3xl' }: Props) {
  return (
    <span
      className={`leading-none ${className}`}
      style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontKerning: 'none', letterSpacing: '-0.01em' }}
    >
      <span style={{ color: '#374151' }}>Happy</span>
      <span style={{ color: '#FFA000' }}>D</span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ display: 'inline-block', width: '0.62em', height: '0.62em', verticalAlign: '-0.04em' }}
      >
        <ellipse cx="12" cy="12" rx="11" ry="11" fill="#FFA000" />
        <g transform="translate(2.2, 19.5) scale(0.007, -0.007)" fill="white">
          <path d="M859 1961 c-96 -101 -118 -225 -69 -395 112 -388 510 -350 510 48 -1 344 -254 544 -441 347z"/>
          <path d="M1628 2002 c-267 -163 -239 -722 36 -722 295 0 437 550 185 715 -84 55 -140 57 -221 7z"/>
          <path d="M363 1430 c-121 -138 -96 -359 57 -498 243 -219 507 32 366 348 -99 224 -297 294 -423 150z"/>
          <path d="M2128 1462 c-276 -168 -297 -569 -34 -635 91 -23 247 91 308 223 122 263 -63 541 -274 412z"/>
          <path d="M1185 1118 c-85 -42 -205 -165 -205 -210 0 -13 -57 -81 -127 -151 -352 -356 -144 -766 307 -607 109 38 301 38 393 0 394 -165 646 237 350 557 -62 68 -144 174 -181 236 -119 197 -344 270 -537 175z"/>
        </g>
      </svg>
      <span style={{ color: '#FFA000' }}>g</span>
    </span>
  );
}
