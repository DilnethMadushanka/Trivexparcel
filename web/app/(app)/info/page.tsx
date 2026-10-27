import { plans } from "@/lib/plans";

export default function InfoPage() {
  return (
    <section className="view">
      <div className="head">
        <h1>How Hariyata works.</h1>
        <p>A shared COD trust network for Sri Lankan online sellers.</p>
      </div>
      <ol className="steps">
        <li><span>When an order comes in, <b>check</b> the customer&apos;s number.</span></li>
        <li><span>Use the verdict to decide: ship COD, call to confirm, or ask for an advance.</span></li>
        <li><span>After delivery, <b>report</b> the result: delivered, rejected or fake.</span></li>
        <li><span>Every seller&apos;s reports combine into a score that gets sharper over time.</span></li>
      </ol>
      <div className="sec">
        <div className="sec-h"><h2>Reading a verdict</h2><span className="aside">Colour and texture show the risk</span></div>
        <div className="vlegend">
          <div className="vcard v-safe"><div className="top"><span>Safe</span></div><p><b>Score 75 to 100.</b> Has accepted COD parcels before. Ship as normal.</p></div>
          <div className="vcard v-confirm"><div className="top"><span>Confirm</span></div><p><b>Score 45 to 74, or little data.</b> Call to confirm before shipping.</p></div>
          <div className="vcard v-risk"><div className="top"><span>Risk</span></div><p><b>Below 45.</b> Rejected or faked orders with several sellers. Take an advance.</p></div>
          <div className="vcard v-new"><div className="top"><span>New</span></div><p><b>No reports yet.</b> A new customer. Confirm, then report the result.</p></div>
        </div>
      </div>
      <div className="sec">
        <div className="sec-h"><h2>Fair and private</h2></div>
        <div className="prose">
          <p><b>Numbers are never stored.</b> Each number is turned into a keyed one-way hash on our server before it reaches the database.</p>
          <p><b>One report can&apos;t ruin anyone.</b> A single report from one seller never produces a Risk verdict, and each seller holds one record per number.</p>
          <p><b>Bad reporters are removed.</b> Admins can block sellers; their reports stop counting immediately.</p>
          <p><b>Fake orders weigh double.</b> A fake order counts twice as much as a rejection.</p>
        </div>
      </div>
      <div className="sec">
        <div className="sec-h"><h2>Plans</h2></div>
        <div className="plans">
          {(["free", "starter", "pro"] as const).map(id => (
            <div key={id} className={`plan ${id === "starter" ? "pick" : ""}`}>
              <h3>{plans[id].name}</h3><b>{plans[id].price ? `Rs. ${plans[id].price.toLocaleString("en-US")}` : "Rs. 0"}</b><span>{plans[id].blurb}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="hint">Keyboard: <kbd>/</kbd> check a number, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> report a result, <kbd>T</kbd> switch theme.</p>
    </section>
  );
}
