/** The notice as the board applies it, so a reader can check their own number. */
export default function EventRules() {
  return (
    <details className="event-rules">
      <summary>이벤트 규칙</summary>
      <table className="event-table">
        <thead>
          <tr><th scope="col">최고계급</th><th scope="col">주캐 조건</th><th scope="col">부캐 조건</th><th scope="col">부캐 최저 시작</th></tr>
        </thead>
        <tbody>
          <tr><td>숫자단</td><td>+2계급</td><td>+3계급</td><td>1단</td></tr>
          <tr><td>문자단</td><td>+2계급</td><td>+3계급</td><td>2단</td></tr>
          <tr><td>녹단</td><td>+2계급</td><td>+3계급</td><td>3단</td></tr>
          <tr><td>노랑단</td><td>+2계급</td><td>+3계급</td><td>마스터</td></tr>
          <tr><td>주황단 이상</td><td>+1계급</td><td>+3계급</td><td>버서커 (언나·육미리·빠킹은 푸질)</td></tr>
        </tbody>
      </table>
      <ul>
        <li>10월 28일 19시 무렵의 계급이 기준입니다. 주캐 조건은 그때의 현재 최고계급, 부캐 최저 시작은 역대 최고계급을 따릅니다.</li>
        <li>역대 최고계급과 현재 최고계급이 다르면 주캐 조건에 1계급이 추가됩니다.</li>
        <li>부캐는 한 캐릭터로 달성해야 하고, 주캐와 계급 차이가 적어도 3계급을 올려야 합니다.</li>
        <li>팬더와 쿠마, 샤오와 미하루는 같은 캐릭터로 봅니다.</li>
        <li>조건을 달성한 뒤에 떨어져도 달성으로 인정합니다.</li>
        <li>그 캐릭터로 게임을 해서 오른 계급만 셉니다. 자동 하한 적용이나 관리자 수정으로 오른 계급은 제외합니다.</li>
        <li>많이 올린 사람부터 순위를 매기고, 같으면 먼저 도달한 사람이 앞섭니다. 상위 20명이 대상입니다.</li>
        <li>시작한 지 2주 미만인 유저와 순수 숫자단은 주최자가 플레이를 보고 판단합니다. 표의 표시는 심사 대상이라는 뜻입니다.</li>
        <li>당첨되면 같이 플레이한 사람의 아이디를 제출해야 합니다.</li>
        <li>가장 많이 강등된 분께도 별도로 증정합니다. 강등 횟수 합계로 세고, 마감 후 발표합니다.</li>
      </ul>
    </details>
  )
}
