import { useId } from "react";

export function RibbonFolderIcon() {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      className="es-ribbon-folder"
      width="38"
      height="38"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-folder`}
          x1="8"
          y1="4"
          x2="56"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#31C5BE" />
          <stop offset="1" stopColor="#138A91" />
        </linearGradient>
        <linearGradient id={`${id}-satin`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFFFFF" />
          <stop offset=".35" stopColor="#E6F7F7" />
          <stop offset=".55" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#C7E4E5" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="1" y="2" width="64" height="66" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      <rect
        x="7"
        y="9"
        width="52"
        height="51"
        rx="3"
        fill="#073C45"
        opacity=".3"
        filter={`url(#${id}-shadow)`}
      />
      <g className="es-folder-body">
        <rect x="6" y="6" width="52" height="52" rx="3" fill={`url(#${id}-folder)`} />
        <path d="M7.5 7.5h49v49h-49z" stroke="#C9FFFA" strokeOpacity=".24" />
        <path d="M8 10c13 2 34 2 48 0M8 54c14-2 34-2 48 0" stroke="#A8F0E7" strokeOpacity=".18" />
      </g>
      <g className="es-ribbon-strip es-ribbon-horizontal-left">
        <path d="M6 27h23v10H6z" fill={`url(#${id}-satin)`} />
        <path d="M7 28h21" stroke="#FFFFFF" strokeOpacity=".95" />
        <path d="M7 36h21" stroke="#B8D9DA" strokeOpacity=".9" />
      </g>
      <g className="es-ribbon-strip es-ribbon-horizontal-right">
        <path d="M35 27h23v10H35z" fill={`url(#${id}-satin)`} />
        <path d="M36 28h21" stroke="#FFFFFF" strokeOpacity=".95" />
        <path d="M36 36h21" stroke="#B8D9DA" strokeOpacity=".9" />
      </g>
      <g className="es-ribbon-strip es-ribbon-vertical-top">
        <path d="M27 6h10v23H27z" fill={`url(#${id}-satin)`} />
        <path d="M28 7v21" stroke="#FFFFFF" strokeOpacity=".95" />
        <path d="M36 7v21" stroke="#B8D9DA" strokeOpacity=".85" />
      </g>
      <g className="es-ribbon-strip es-ribbon-vertical-bottom">
        <path d="M27 35h10v23H27z" fill={`url(#${id}-satin)`} />
        <path d="M28 36v21" stroke="#FFFFFF" strokeOpacity=".95" />
        <path d="M36 36v21" stroke="#B8D9DA" strokeOpacity=".85" />
      </g>
      <g className="es-bow-loop es-bow-loop-left">
        <path
          d="M31.5 31.7c-5.3-7.5-14.2-9.5-16.1-5.1-1.6 3.8 3.1 9.4 13.4 10.1l2.7-5Z"
          fill={`url(#${id}-satin)`}
        />
        <path d="M29.8 31.8c-4.7-3.8-9.4-5.4-12.4-5" stroke="#B4D4D6" strokeWidth=".8" />
      </g>
      <g className="es-bow-loop es-bow-loop-right">
        <path
          d="M32.5 31.7c5.3-7.5 14.2-9.5 16.1-5.1 1.6 3.8-3.1 9.4-13.4 10.1l-2.7-5Z"
          fill={`url(#${id}-satin)`}
        />
        <path d="M34.2 31.8c4.7-3.8 9.4-5.4 12.4-5" stroke="#B4D4D6" strokeWidth=".8" />
      </g>
      <g className="es-bow-tail es-bow-tail-left">
        <path d="m29.8 34.2-9.5 11.2-6.1-3.2 12.1-11 3.5 3Z" fill={`url(#${id}-satin)`} />
        <path d="m27.2 34.2-9.8 8.3" stroke="#B4D4D6" strokeWidth=".8" />
      </g>
      <g className="es-bow-tail es-bow-tail-right">
        <path d="m34.2 34.2 9.5 11.2 6.1-3.2-12.1-11-3.5 3Z" fill={`url(#${id}-satin)`} />
        <path d="m36.8 34.2 9.8 8.3" stroke="#B4D4D6" strokeWidth=".8" />
      </g>
      <g className="es-bow-knot">
        <path
          d="M32 28.5c-1.6 0-2.9 1.3-2.9 2.9v2.2c0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9v-2.2c0-1.6-1.3-2.9-2.9-2.9Z"
          fill={`url(#${id}-satin)`}
        />
        <path d="M31 30c.7-.5 1.4-.5 2 0" stroke="#FFFFFF" strokeWidth=".8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
