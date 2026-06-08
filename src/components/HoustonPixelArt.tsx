export default function HoustonPixelArt({ className }: { className?: string }) {
  return (
    <svg
      width="100%" viewBox="0 0 260 88"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated', display: 'block' }}
      shapeRendering="crispEdges"
      aria-label="Houston skyline pixel art"
      className={className}
    >
      {/* Sky */}
      <rect width="260" height="88" fill="#04040e"/>

      {/* Stars */}
      <rect x="6"   y="4"  width="2" height="2" fill="#fffef0" opacity="0.7"/>
      <rect x="20"  y="7"  width="2" height="2" fill="#fffef0" opacity="0.5"/>
      <rect x="42"  y="3"  width="2" height="2" fill="#fffef0" opacity="0.8"/>
      <rect x="66"  y="9"  width="2" height="2" fill="#fffef0" opacity="0.5"/>
      <rect x="85"  y="2"  width="2" height="2" fill="#fffef0" opacity="0.6"/>
      <rect x="115" y="7"  width="2" height="2" fill="#fffef0" opacity="0.7"/>
      <rect x="138" y="3"  width="2" height="2" fill="#fffef0" opacity="0.5"/>
      <rect x="164" y="8"  width="2" height="2" fill="#fffef0" opacity="0.8"/>
      <rect x="188" y="4"  width="2" height="2" fill="#fffef0" opacity="0.5"/>
      <rect x="214" y="6"  width="2" height="2" fill="#fffef0" opacity="0.6"/>
      <rect x="238" y="3"  width="2" height="2" fill="#fffef0" opacity="0.7"/>
      <rect x="14"  y="14" width="2" height="2" fill="#fffef0" opacity="0.4"/>
      <rect x="50"  y="11" width="2" height="2" fill="#fffef0" opacity="0.5"/>
      <rect x="178" y="12" width="2" height="2" fill="#fffef0" opacity="0.4"/>
      <rect x="246" y="10" width="2" height="2" fill="#fffef0" opacity="0.5"/>

      {/* Moon — crescent */}
      <rect x="240" y="6"  width="10" height="10" fill="#fff8d0" opacity="0.9"/>
      <rect x="244" y="6"  width="8"  height="10" fill="#04040e"/>

      {/* ── BUILDINGS ── */}

      {/* B1 small left */}
      <rect x="0"   y="74" width="14" height="10" fill="#1c1c2e"/>
      {/* B2 */}
      <rect x="16"  y="64" width="10" height="20" fill="#202030"/>
      {/* B3 with parapet */}
      <rect x="28"  y="68" width="14" height="16" fill="#1c1c2e"/>
      <rect x="30"  y="66" width="10" height="2"  fill="#222238"/>
      {/* B4 small */}
      <rect x="44"  y="76" width="10" height="8"  fill="#1c1c2e"/>
      {/* B5 — Williams Tower-ish with antenna */}
      <rect x="56"  y="52" width="16" height="32" fill="#222235"/>
      <rect x="58"  y="50" width="12" height="2"  fill="#282842"/>
      <rect x="63"  y="46" width="2"  height="4"  fill="#3a3a56"/>
      {/* B6 tall */}
      <rect x="74"  y="46" width="12" height="38" fill="#1c1c2e"/>

      {/* ── JPMorgan Chase Tower (tallest, stepped pyramid top) ── */}
      <rect x="88"  y="16" width="24" height="68" fill="#1a1a2c"/>
      <rect x="90"  y="12" width="20" height="4"  fill="#1e1e30"/>
      <rect x="92"  y="8"  width="16" height="4"  fill="#1e1e30"/>
      <rect x="96"  y="4"  width="8"  height="4"  fill="#222238"/>
      <rect x="98"  y="2"  width="4"  height="2"  fill="#282844"/>

      {/* B8 */}
      <rect x="114" y="44" width="14" height="40" fill="#202030"/>

      {/* Pennzoil Place Left (stepped top) */}
      <rect x="130" y="34" width="16" height="50" fill="#232335"/>
      <rect x="132" y="26" width="12" height="8"  fill="#1e1e30"/>
      <rect x="134" y="22" width="8"  height="4"  fill="#222238"/>

      {/* Pennzoil Place Right (stepped top) */}
      <rect x="148" y="38" width="16" height="46" fill="#222235"/>
      <rect x="150" y="30" width="12" height="8"  fill="#1e1e30"/>
      <rect x="152" y="26" width="8"  height="4"  fill="#1c1c2c"/>

      {/* B11 */}
      <rect x="166" y="54" width="14" height="30" fill="#1c1c2e"/>
      {/* B12 */}
      <rect x="182" y="60" width="18" height="24" fill="#202030"/>
      {/* B13 with parapet */}
      <rect x="202" y="52" width="14" height="32" fill="#1c1c2e"/>
      <rect x="204" y="50" width="10" height="2"  fill="#252538"/>
      {/* B14 */}
      <rect x="218" y="64" width="16" height="20" fill="#202030"/>
      {/* B15 */}
      <rect x="236" y="70" width="14" height="14" fill="#1c1c2e"/>
      {/* B16 */}
      <rect x="252" y="74" width="8"  height="10" fill="#1c1c2e"/>

      {/* ── WINDOWS (lit) ── */}

      {/* Chase Tower — gold + blue office lights */}
      <rect x="90"  y="20" width="4" height="3" fill="#c89b3c" opacity="0.8"/>
      <rect x="98"  y="20" width="4" height="3" fill="#c89b3c" opacity="0.7"/>
      <rect x="106" y="20" width="4" height="3" fill="#c89b3c" opacity="0.6"/>
      <rect x="90"  y="28" width="4" height="3" fill="#4455bb" opacity="0.6"/>
      <rect x="102" y="28" width="4" height="3" fill="#c89b3c" opacity="0.7"/>
      <rect x="90"  y="38" width="4" height="3" fill="#c89b3c" opacity="0.5"/>
      <rect x="98"  y="38" width="4" height="3" fill="#4455bb" opacity="0.5"/>
      <rect x="106" y="46" width="4" height="3" fill="#c89b3c" opacity="0.6"/>
      <rect x="90"  y="54" width="4" height="3" fill="#c89b3c" opacity="0.4"/>
      <rect x="102" y="54" width="4" height="3" fill="#4455bb" opacity="0.4"/>
      <rect x="90"  y="64" width="4" height="3" fill="#c89b3c" opacity="0.3"/>
      <rect x="106" y="64" width="4" height="3" fill="#c89b3c" opacity="0.3"/>

      {/* Other buildings */}
      <rect x="58"  y="56" width="3" height="3" fill="#c89b3c" opacity="0.6"/>
      <rect x="64"  y="62" width="3" height="3" fill="#c89b3c" opacity="0.5"/>
      <rect x="58"  y="66" width="3" height="3" fill="#4455bb" opacity="0.5"/>
      <rect x="76"  y="50" width="3" height="3" fill="#c89b3c" opacity="0.7"/>
      <rect x="82"  y="58" width="3" height="3" fill="#c89b3c" opacity="0.5"/>
      <rect x="76"  y="64" width="3" height="3" fill="#4455bb" opacity="0.5"/>
      <rect x="116" y="48" width="3" height="3" fill="#c89b3c" opacity="0.6"/>
      <rect x="122" y="56" width="3" height="3" fill="#4455bb" opacity="0.5"/>
      <rect x="132" y="38" width="3" height="3" fill="#c89b3c" opacity="0.7"/>
      <rect x="138" y="46" width="3" height="3" fill="#c89b3c" opacity="0.5"/>
      <rect x="150" y="42" width="3" height="3" fill="#4455bb" opacity="0.6"/>
      <rect x="156" y="50" width="3" height="3" fill="#c89b3c" opacity="0.5"/>
      <rect x="168" y="58" width="3" height="3" fill="#c89b3c" opacity="0.5"/>
      <rect x="204" y="56" width="3" height="3" fill="#c89b3c" opacity="0.6"/>
      <rect x="185" y="64" width="3" height="3" fill="#4455bb" opacity="0.5"/>
      <rect x="220" y="68" width="3" height="3" fill="#c89b3c" opacity="0.5"/>

      {/* Ground */}
      <rect x="0"   y="84" width="260" height="4" fill="#080818"/>

      {/* Subtle horizon glow */}
      <rect x="40" y="82" width="180" height="2" fill="#c89b3c" opacity="0.06"/>

      {/* Label */}
      <text x="130" y="87" fill="#c89b3c" fontSize="5" fontFamily="monospace"
        textAnchor="middle" opacity="0.45" letterSpacing="2">
        HOUSTON, TX
      </text>
    </svg>
  )
}
