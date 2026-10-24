import { PHONE_BACK, PHONE_BODY, PHONE_LEFT_FACE, PHONE_RIGHT_FACE, ROUTING_ARCH, ROUTING_ARCH_INNER, ROUTING_ARCHES, ROUTING_BARS, ROUTING_BASE, ROUTING_BASE_EDGE, ROUTING_CONTACT, ROUTING_RAILS, ROUTING_SHEETS, ROUTING_WING_EDGE } from "../lib/hero-call-routing-geometry";
import type { ScenarioType } from "./hero-call-routing";

/** Each face is native vector geometry. No image, texture, or traced bitmap is
 * embedded. The reference only supplies the proportions and material palette. */
export function HeroRoutingArt({ uid, scenario, hovered, onHover }: {
  uid:string; scenario:ScenarioType; hovered:number|null; onHover:(part:number|null)=>void;
}) {
  const fill = (name:string) => `url(#${uid}-${name})`;
  return <svg viewBox="600 125 1072 775" className="hero-call-routing-svg" role="img" aria-labelledby={`${uid}-title`}>
    <title id={`${uid}-title`}>An interactive call-routing illustration. Calls become qualified leads and scheduled follow-up.</title>
    <defs>
      <linearGradient id={`${uid}-surface`} x1=".15" y1="0" x2=".8" y2="1"><stop stopColor="#fffefd"/><stop offset=".55" stopColor="#f8f5f0"/><stop offset="1" stopColor="#e9e3db"/></linearGradient>
      <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffefd"/><stop offset=".7" stopColor="#fbf9f6"/><stop offset="1" stopColor="#e9e5df"/></linearGradient>
      <linearGradient id={`${uid}-side`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e7e1d7"/><stop offset=".5" stopColor="#ded6cb"/><stop offset="1" stopColor="#c7beb0"/></linearGradient>
      <linearGradient id={`${uid}-bevel`} x1="0" y1="0" x2="1" y2=".5"><stop stopColor="#fff"/><stop offset=".3" stopColor="#f6f2ec"/><stop offset=".7" stopColor="#e2dbd1"/><stop offset="1" stopColor="#c6bcae"/></linearGradient>
      <linearGradient id={`${uid}-arch`} x1="0" y1="0" x2="1" y2=".3"><stop stopColor="#e9e3da"/><stop offset=".12" stopColor="#fffefd"/><stop offset=".65" stopColor="#faf8f4"/><stop offset="1" stopColor="#e0d9cf"/></linearGradient>
      <linearGradient id={`${uid}-cylinder`}><stop stopColor="#bcb3a6"/><stop offset=".18" stopColor="#efebe4"/><stop offset=".4" stopColor="#fffefd"/><stop offset=".7" stopColor="#e8e2d9"/><stop offset="1" stopColor="#c0b6a8"/></linearGradient>
      <linearGradient id={`${uid}-orange-bar`}><stop stopColor="#e95911"/><stop offset=".3" stopColor="#ff9b4d"/><stop offset=".65" stopColor="#ff7c23"/><stop offset="1" stopColor="#ef5d15"/></linearGradient>
      <radialGradient id={`${uid}-signal`} cx=".3" cy=".25" r=".8"><stop stopColor="#ffd5a5"/><stop offset=".4" stopColor="#ff9d4d"/><stop offset="1" stopColor="#fa6a18"/></radialGradient>
      <radialGradient id={`${uid}-ground`}><stop stopColor="#e4a767" stopOpacity=".3"/><stop offset="1" stopColor="#e4a767" stopOpacity="0"/></radialGradient>
      <filter id={`${uid}-shadow`} x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>
      <filter id={`${uid}-mounted-shadow`} x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#735334" floodOpacity=".24"/></filter>
      <filter id={`${uid}-contact-shadow`} x="-40%" y="-40%" width="180%" height="190%"><feGaussianBlur stdDeviation="3.5"/></filter>
      <clipPath id={`${uid}-left-ear`}><path d={PHONE_LEFT_FACE}/></clipPath>
      <clipPath id={`${uid}-right-ear`}><path d={PHONE_RIGHT_FACE}/></clipPath>
      <clipPath id={`${uid}-tray-contents`}><path d="M1100 110 H1590 V310 L1355 446 Q1340 455 1326 446 L1127 330 L1100 330Z"/></clipPath>
      <clipPath id={`${uid}-contact-face`}><path d={ROUTING_CONTACT}/></clipPath>
      {ROUTING_SHEETS.map((card,index)=><clipPath key={index} id={`${uid}-card-${index}`}><rect width={card.w} height={card.h} rx="12"/></clipPath>)}
    </defs>
    <g stroke="#605d57" strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="1135" cy="745" rx="500" ry="145" fill={fill("ground")} stroke="none"/>
      <path d={ROUTING_BASE} fill="#d8b48e" stroke="none" opacity=".16" transform="translate(5 25)" filter={fill("shadow")}/>
      <path d={ROUTING_WING_EDGE} fill={fill("side")}/>
      <path d={ROUTING_BASE_EDGE} fill={fill("side")}/>
      <path d={ROUTING_BASE} fill={fill("surface")}/>
      <path d="M642 638 L969 828 Q986 838 1002 828 L1243 704" fill="none" stroke="#fffefd" strokeWidth="3"/>
      <path d="M1225 665 L1403 562 Q1415 555 1429 562 L1600 610" fill="none" stroke="#fffefd" strokeWidth="2.8"/>

      {/* Parallel rail cores share a light crown and a warm lower seam. */}
      {ROUTING_RAILS.map((path,index)=><g key={path}>
        <path d={path} fill="none" stroke="#9e9486" strokeWidth="8.2" transform="translate(0 3)"/>
        <path d={path} fill="none" stroke="#c4baab" strokeWidth="8.2"/>
        <path d={path} fill="none" stroke="#fffdf9" strokeWidth="5.4"/>
        <path d={path} fill="none" stroke="#eee7db" strokeWidth="1.3"/>
        {index===1&&<path d="M908 555 L946 533" stroke="#ff7a25" strokeWidth="3.5"/>}
      </g>)}

      <path d="M1140 407 L1335 523 L1558 396 L1542 417 L1347 535 Q1337 542 1323 534Z" fill="#77624b" stroke="none" opacity=".18" filter={fill("contact-shadow")}/>
      {/* Tray rear rim and dark inner well are behind all contact sheets. */}
      <path d="M1134 326 L1339 211 Q1350 205 1363 213 L1553 320 Q1565 326 1561 338 L1554 389 L1351 507 L1134 376Z" fill={fill("side")}/>
      <path d="M1144 331 L1343 220 Q1351 216 1361 222 L1546 327 L1345 446Z" fill="#cfc7ba" stroke="#9a9081"/>
      <path d="M1144 331 L1343 220 Q1351 216 1361 222 L1546 327" fill="none" stroke="#fffefb" strokeWidth="8"/>
      <g clipPath={`url(#${uid}-tray-contents)`}>
      {ROUTING_SHEETS.map((card,index)=><g key={index} transform={`translate(${card.x} ${card.y})`}>
        {/* Hit regions stay at the rest pose even while the paper lifts. */}
        <g onPointerEnter={()=>onHover(index)} onPointerLeave={()=>onHover(null)}>
          <path d={`M-4 -8 L${card.w+10} ${card.w*.55-8} L${card.w+10} ${card.w*.55+card.h+8} L-4 ${card.h+8}Z`} fill="transparent" stroke="none"/>
          <g className="routing-vector-sheet" data-lifted={hovered===index||(scenario==="lead-generation"&&card.selected)}>
            <g transform="matrix(1 .55 0 1 0 0)" filter={card.selected ? fill("mounted-shadow") : undefined}>
              <rect x="4" y="-1" width={card.w} height={card.h} rx="12" fill={card.selected?'#ee6a22':'#c9c0b3'} stroke={card.selected?'#ed661e':'#81796d'}/>
              <rect width={card.w} height={card.h} rx="12" fill={fill("paper")} stroke={card.selected?'#ff792a':'#605d57'} strokeWidth={card.selected?2.7:1.35}/>
              <path d={`M11 5 H${card.w-14} Q${card.w-5} 5 ${card.w-5} 14 V${card.h-12}`} fill="none" stroke="#fff" strokeWidth="1.7"/>
              <g clipPath={`url(#${uid}-card-${index})`} stroke="none">
                <ellipse cx="32" cy="46" rx="18" ry="23" fill="#dedad3"/>
                <ellipse cx="32" cy="38" rx="8" ry="10" fill="#aca69e"/>
                <path d="M20 58 C20 43 44 43 44 58 L44 63 Q33 71 21 62Z" fill="#aca69e"/>
                <rect x="64" y="39" width={card.w-87} height="6" rx="3" fill="#c0bbb3"/>
                <rect x="64" y="57" width={card.w-87} height="6" rx="3" fill="#c0bbb3"/>
                <rect x="24" y="87" width={card.w-48} height="6" rx="3" fill="#c5c0b9"/>
                <rect x="24" y="105" width={card.w-48} height="6" rx="3" fill="#c5c0b9"/>
                <rect x="24" y="123" width={card.w-65} height="6" rx="3" fill="#d2cdc5"/>
              </g>
            </g>
          </g>
        </g>
      </g>)}
      {/* Low front divider visible between the nearest page and the tray lip. */}
      <g transform="matrix(1 .55 0 1 1288 347)">
        <rect width="85" height="115" rx="8" fill={fill("paper")}/>
        <ellipse cx="30" cy="58" rx="15" ry="20" fill="#d8d2c9" stroke="none"/>
        <ellipse cx="30" cy="52" rx="7" ry="9" fill="#aaa298" stroke="none"/>
        <path d="M20 71 Q20 53 40 63 L40 77Z" fill="#aaa298" stroke="none"/>
      </g>
      </g>
      {/* Front wall occludes the bottom of every sheet. */}
      <path d="M1127 330 L1326 446 Q1340 455 1355 446 L1558 330 L1558 379 Q1558 392 1546 399 L1356 512 Q1341 522 1326 514 L1141 407 Q1127 399 1127 384Z" fill={fill("surface")}/>
      <path d="M1129 331 L1327 447 Q1340 455 1355 447 L1556 331" fill="none" stroke="#fffefb" strokeWidth="9"/>
      <path d="M1340 460 V513" stroke="#dad2c6"/>
      <path d="M1141 407 L1326 514 Q1341 522 1356 512" fill="none" stroke="#a79d8e" strokeWidth=".8"/>

      {/* The moving card carries its own clipped avatar and printed rules. */}
      <g className="routing-vector-contact">
        <path d={ROUTING_CONTACT} fill="#d49c69" stroke="none" opacity=".3" transform="translate(3 11)" filter={fill("contact-shadow")}/>
        <path d={ROUTING_CONTACT} fill="#e76b25" stroke="#e76b25" strokeWidth="3" transform="translate(0 5)"/>
        <path d={ROUTING_CONTACT} fill={fill("paper")} stroke="#ff7825" strokeWidth="3"/>
        <g clipPath={`url(#${uid}-contact-face)`}>
          <g transform="matrix(.866 .5 -.866 .5 1066 470)" stroke="none">
            <circle r="21" fill="#ded9d1"/><ellipse cy="-6" rx="9" ry="9" fill="#a69e92"/>
            <ellipse cy="9" rx="13" ry="9" fill="#a69e92"/>
            <rect x="-42" y="30" width="80" height="6" rx="3" fill="#c4bcb0"/>
            <rect x="-42" y="46" width="60" height="6" rx="3" fill="#d2cabe"/>
          </g>
        </g>
      </g>
      <ellipse cx="1138" cy="551" rx="127" ry="28" transform="rotate(29 1138 551)" fill="#e7b783" opacity=".1" stroke="none" filter={fill("shadow")}/>
      {ROUTING_ARCHES.map(({x,y},index)=><g key={index} transform={`translate(${x} ${y})`}>
        <path d="M941 475 L962 487 L1147 594 L1125 606Z" fill="#7b6851" opacity=".2" stroke="none" filter={fill("contact-shadow")}/>
        <path d={ROUTING_ARCH} transform="translate(10 -6)" fill={fill("bevel")}/>
        <path d={ROUTING_ARCH} fill={fill("arch")}/>
        <path d={ROUTING_ARCH_INNER} fill={fill("side")} stroke="#978d7f" strokeWidth=".9"/>
        <path d="M949 467 V406 C949 379 960 359 982 369 L1086 428 C1111 443 1128 463 1128 497 V586" fill="none" stroke="#fff" strokeWidth="2.6"/>
      </g>)}
      <g transform="translate(941 535)"><g className="routing-vector-signal">
        <ellipse cy="22" rx="19" ry="7" fill="#e9b27c" opacity=".16" stroke="none"/>
        <circle r="15" fill={fill("signal")} stroke="#ff8e36" strokeWidth=".8"/>
        <ellipse cx="-4" cy="-6" rx="6" ry="4" fill="#ffe3bc" opacity=".5" stroke="none"/>
      </g></g>

      {/* Calendar easel and page are built on the same affine plane. */}
      <path d="M1433 541 L1594 635 Q1604 640 1617 633 L1642 618 L1621 608 L1470 525Z" fill="#74614c" stroke="none" opacity=".23" filter={fill("contact-shadow")}/>
      <g className="routing-vector-calendar">
        <path d="M1467 400 L1585 467 L1630 578 L1594 599 L1474 530Z" fill={fill("side")}/>
        <path d="M1488 432 L1576 482 L1606 564 L1588 575 L1495 522Z" fill="#afa395" stroke="#948879"/>
        <path d="M1446 520 L1583 599 Q1593 604 1603 598 L1637 578 L1642 600 Q1644 610 1633 615 L1606 630 Q1596 635 1584 627 L1438 543Z" fill={fill("surface")}/>
        <g transform="matrix(1.02 .55 -.184 .765 1467 391)">
          <path d="M6 8 H144 V183 Q144 193 135 193 H4Z" fill="#b3a797" stroke="#766c60"/>
          <rect width="139" height="190" rx="4" fill={fill("paper")}/>
          <path d="M3 187 V5 Q3 3 6 3 H134" fill="none" stroke="#fff" strokeWidth="2"/>
          <rect x="9" y="34" width="121" height="145" fill="#fffefd" stroke="#c9c0b5" strokeWidth=".9"/>
          {Array.from({length:6},(_,index)=><path key={`v${index}`} d={`M${9+index*24.2} 34 V179`} stroke="#d6cfc4" strokeWidth=".9"/>)}
          {Array.from({length:6},(_,index)=><path key={`h${index}`} d={`M9 ${34+index*29} H130`} stroke="#d6cfc4" strokeWidth=".9"/>)}
          <rect x="58" y="92" width="23" height="28" fill="#ff6c1d" stroke="none" className="routing-vector-date"/>
          {[12,47,82,117].map(x=><g key={x}>
            <ellipse cx={x} cy="14" rx="5" ry="6" fill="#948574" stroke="none"/>
            <path d={`M${x+2} 15 C${x-11} 17 ${x-12} -18 ${x+1} -17 C${x+13} -16 ${x+14} -2 ${x+8} 2`} fill="none" stroke="#6f6354" strokeWidth="5"/>
            <path d={`M${x+2} 15 C${x-11} 17 ${x-12} -18 ${x+1} -17 C${x+13} -16 ${x+14} -2 ${x+8} 2`} fill="none" stroke="#ede5d9" strokeWidth="2.5"/>
          </g>)}
        </g>
      </g>

      {ROUTING_BARS.map((bar,index)=><g key={index} transform={`translate(${bar.x} ${bar.y})`}>
        <ellipse cy="6" rx="10" ry="4" fill="#ba9a73" opacity=".13" stroke="none"/>
        <g className={`routing-vector-wave routing-vector-wave-${index}`}>
          <path d={`M-6 -${bar.h} A6 3.5 0 0 1 6 -${bar.h} V0 A6 3.5 0 0 1 -6 0Z`} fill={fill(bar.orange?'orange-bar':'cylinder')} stroke={bar.orange?'#f37124':'#8f8270'} strokeWidth="1"/>
          <path d={`M-3 -${bar.h-3} V-3`} fill="none" stroke={bar.orange?'#ffca8b':'#fff'} strokeWidth="2"/>
          <ellipse cy={-bar.h} rx="6" ry="3.5" fill={bar.orange?'#ffb16c':'#fffdf8'} stroke={bar.orange?'#f37124':'#8f8270'} strokeWidth="1"/>
        </g>
      </g>)}

      {/* One cast shadow per mounted part; nearer receiver hides the meters. */}
      <path d="M698 610 Q803 595 927 722 L980 756 L940 781 Q813 747 710 657Z" fill="#796b59" opacity=".2" stroke="none" filter={fill("shadow")}/>
      <ellipse cx="761" cy="660" rx="39" ry="12" fill="#74624b" opacity=".22" stroke="none" filter={fill("contact-shadow")}/>
      <ellipse cx="868" cy="733" rx="29" ry="10" fill="#74624b" opacity=".24" stroke="none" filter={fill("contact-shadow")}/>
      {/* Continuous rounded pedestal faces, with the top seated under the bridge. */}
      <path d="M739 641 L750 597 Q753 587 764 592 L783 602 Q790 606 791 615 L793 644 Q793 651 785 656 L759 671 Q751 675 743 670 L732 664 Q727 660 731 653Z" fill={fill("side")}/>
      <path d="M731 654 L745 611 Q748 603 755 605 L769 612 L768 654 Q768 659 762 662 L749 670 Q744 672 739 668 L733 664 Q729 661 731 654Z" fill={fill("paper")}/>
      <path d="M746 612 Q749 606 755 608 L765 613" fill="none" stroke="#fff" strokeWidth="2"/>
      <path d="M847 659 Q847 651 855 654 L875 665 Q881 669 882 680 L885 718 Q885 726 878 730 L865 738 Q860 741 854 737 L845 732 Q841 730 842 723Z" fill={fill("side")}/>
      <path d="M845 664 Q845 657 851 660 L862 666 Q867 669 867 676 L870 722 Q870 729 865 733 L860 736 L847 729 Q844 727 844 721Z" fill={fill("paper")}/>
      <path d="M848 663 L860 670 Q863 672 863 679" fill="none" stroke="#fff" strokeWidth="1.8"/>
      <g className="routing-vector-handset">
        <path d={PHONE_BACK} fill={fill("bevel")}/>
        <path d={PHONE_BODY} fill={fill("surface")}/>
        {/* Inner bridge follows one uninterrupted curve into each receiver. */}
        <path d="M741 578 C754 566 773 578 790 584 C833 602 869 637 887 674 C895 691 895 712 906 733" fill="none" stroke="#a09585" strokeWidth="2"/>
        <path d="M679 528 C696 508 719 506 744 514 C839 543 934 624 969 699" fill="none" stroke="#fff" strokeWidth="2.5"/>
        <path d={PHONE_LEFT_FACE} fill={fill("paper")} stroke="#70695f"/>
        <path d={PHONE_RIGHT_FACE} fill={fill("paper")} stroke="#70695f"/>
        <g clipPath={`url(#${uid}-left-ear)`}>
          <path d="M673 552 C660 581 689 626 714 629 C730 632 739 621 740 607" fill="none" stroke="#c3b9aa" strokeWidth="2.5"/>
          <path d="M676 552 C672 543 683 538 692 541" fill="none" stroke="#fff" strokeWidth="2"/>
          <path d="M682 576 L696 606 M689 571 L703 601 M696 567 L710 596" fill="none" stroke="#82796b" strokeWidth="3.2"/>
        </g>
        <g clipPath={`url(#${uid}-right-ear)`}>
          <path d="M909 694 C905 715 928 754 948 760 C960 764 968 756 969 744" fill="none" stroke="#c3b9aa" strokeWidth="2.5"/>
          <path d="M912 689 Q918 679 929 684" fill="none" stroke="#fff" strokeWidth="2"/>
          <path d="M916 709 L940 736 M916 718 L938 743 M919 730 L932 745" fill="none" stroke="#82796b" strokeWidth="3.2"/>
        </g>
      </g>

    </g>
  </svg>;
}
