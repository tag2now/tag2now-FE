import {useEffect} from "react";
import {useMediaQuery} from 'react-responsive'

interface GoogleAdvertiseProps {
  className: string,
  client: string,
  slot: string,
  format: string,
  responsive: string,
  layoutKey: string
}

export default function GoogleAdvertise({
  className = "adsbygoogle",
  client,
  slot,
  format,
  responsive,
  layoutKey
}: GoogleAdvertiseProps) {
  useEffect(() => {
    //production인 경우만 광고 요청
    //어차피 로컬에서는 광고가 표시되지 않는다
    if (process.env.NODE_ENV === "production")
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        console.log("Advertise is pushed");
      } catch (e) {
        console.error("AdvertiseError", e);
      }
  }, []);

  const isDesktop = useMediaQuery({ query: '(min-width: 1440px)' });
  if(!isDesktop) return null;

  //production이 아닌 경우 대체 컴포넌트 표시
  if (process.env.NODE_ENV !== "production")
    return (
      <div
        className={className}
        style={{
          background: "#e9e9e9",
          color: "black",
          fontSize: "18px",
          fontWeight: "bold",
          textAlign: "center",
          padding: "16px"
        }}
      >
        광고 표시 영역
      </div>
    );
  //production인 경우 구글 광고 표시
  return (
    <ins
      className={className}
      style={{
        overflowX: "auto",
        overflowY: "hidden",
        display: "block",
        textAlign: "center"
      }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
      data-ad-layout-key={layoutKey}
    />
  );
};

// <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1216394999861449"
//         crossOrigin="anonymous"></script>
// <!-- desktop -->
// <ins className="adsbygoogle"
//      style="display:block"
//      data-ad-client="ca-pub-1216394999861449"
//      data-ad-slot="4642693487"
//      data-ad-format="auto"
//      data-full-width-responsive="true"></ins>
// <script>
//     (adsbygoogle = window.adsbygoogle || []).push({});
// </script>