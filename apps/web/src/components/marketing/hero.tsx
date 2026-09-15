import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { DEMO_URL } from "./content";
import { CustomerWall } from "./customer-wall";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <section className="ea-intro" aria-labelledby="hero-heading">
      <div className="ea-wrap ea-intro-grid">
        <div className="ea-hero-copy">
          <p className="ea-eyebrow">
            <span className="ea-small-diamond" aria-hidden="true" /> More opportunity. Already in
            your lease.
          </p>
          <h1 id="hero-heading">
            Get more from the retail marketing you <span>already pay for.</span>
          </h1>
          <p className="ea-hero-description">
            Your shopping centers have the channels. You have the campaigns. Engagement Agents
            brings them together to help drive more traffic and sales.
          </p>
          <div className="ea-actions">
            <a href={DEMO_URL} className="ea-button ea-button-primary">
              Book a Demo <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a href="#how" className="ea-text-link">
              See How It Works <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <Reveal className="ea-hero-art" hero>
          <div className="ea-art-label">
            <span /> Retail campaigns, connected.
          </div>
          <img
            src="/ea/illustrations/hero.png"
            alt="Retail campaigns reaching shoppers through mobile, email and sales promotions"
            width={593}
            height={371}
            fetchPriority="high"
          />
          <div className="ea-art-caption">
            <span>Your stores</span>
            <Plus size={14} aria-hidden="true" />
            <span>Your shopping centers</span>
          </div>
        </Reveal>
        <CustomerWall />
      </div>
    </section>
  );
}
