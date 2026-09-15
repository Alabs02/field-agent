import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  Globe2,
  Mail,
  Maximize2,
  MessageCircle,
  Search,
  Smartphone,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  BENEFITS,
  DEMO_URL,
  INSIGHTS,
  NAV_LINKS,
  PROCESS,
  RESULTS,
  TESTIMONIALS,
  type Testimonial,
} from "./content";
import { Reveal } from "./reveal";

export function Proof() {
  return (
    <section id="proof" className="ea-section ea-results" aria-labelledby="results-heading">
      <div className="ea-wrap">
        <div className="ea-section-top">
          <div>
            <p className="ea-eyebrow">A track record that speaks for itself</p>
            <h2 id="results-heading">Real retailers. Real returns.</h2>
          </div>
          <a href="#stories" className="ea-text-link">
            Hear from our customers <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <Reveal>
          <ul className="ea-result-grid">
            {RESULTS.map((result) => (
              <li key={result.value}>
                <img
                  src={`/ea/illustrations/${result.image}`}
                  width={result.width}
                  height={result.height}
                  alt=""
                  loading="lazy"
                />
                <p className="ea-result-value">{result.value}</p>
                <h3>{result.label}</h3>
                <p className="ea-muted">{result.context}</p>
              </li>
            ))}
          </ul>
        </Reveal>
        <p className="ea-source-note">
          Individual retailer outcomes.{" "}
          <a href={RESULTS[0].source}>
            Explore the published results <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </p>
      </div>
    </section>
  );
}

export function Pillars() {
  return (
    <section id="why" className="ea-section" aria-labelledby="benefits-heading">
      <div className="ea-wrap ea-benefits-layout">
        <div className="ea-benefits-intro">
          <p className="ea-eyebrow">How we help retailers</p>
          <h2 id="benefits-heading">
            There’s more value
            <br />
            in every lease.
          </h2>
          <p className="ea-lede">
            Your rent helps fund your shopping centers’ marketing. Make those opportunities part of
            your everyday strategy.
          </p>
          <div className="ea-note">
            <span className="ea-small-diamond" aria-hidden="true" />
            <p>From your next campaign to your next lease conversation.</p>
          </div>
        </div>
        <ol className="ea-benefit-list">
          {BENEFITS.map((benefit, i) => (
            <li key={benefit.title}>
              <span className="ea-row-number">0{i + 1}</span>
              <div>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
                <a href={benefit.href} className="ea-text-link">
                  {benefit.label}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="ea-section ea-process" aria-labelledby="process-heading">
      <div className="ea-wrap">
        <div className="ea-centered-heading">
          <p className="ea-eyebrow">How it works</p>
          <h2 id="process-heading">
            Your campaigns. Their channels.
            <br />
            Connected.
          </h2>
          <p className="ea-lede">
            One platform brings your retail marketing and your shopping centers together.
          </p>
        </div>
        <figure className="ea-process-figure">
          <img
            src="/ea/illustrations/how-it-works.png"
            alt="Retailer plus Engagement Agents plus shopping center equals return on engagement. The four stages are explained below."
            width={970}
            height={476}
            loading="lazy"
          />
          <figcaption>
            <details className="ea-disclosure ea-diagram-zoom">
              <summary>
                <span className="ea-when-closed">View full diagram</span>
                <span className="ea-when-open">Close full diagram</span>
                <Maximize2 size={15} aria-hidden="true" />
              </summary>
              <p className="ea-zoom-hint">Scroll across to explore the diagram in detail.</p>
              <div
                className="ea-diagram-scroll"
                role="region"
                aria-label="Full-size process diagram; scroll horizontally to explore"
                tabIndex={0}
              >
                <img
                  src="/ea/illustrations/how-it-works.png"
                  alt="Full-size diagram showing the retailer, Engagement Agents, shopping-center channels and return on engagement"
                  width={970}
                  height={476}
                  loading="lazy"
                />
              </div>
            </details>
          </figcaption>
        </figure>
        <Reveal sequence>
          <ol className="ea-process-steps">
            {PROCESS.map((step, i) => (
              <li key={step.title}>
                <span className={`ea-process-marker ea-stage-${i}`} aria-hidden="true">
                  <span>0{i + 1}</span>
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

function DistributionDiagram() {
  return (
    <div
      className="ea-feature-visual ea-distribution"
      role="img"
      aria-label="Your campaign connects to shopping-center websites, email, social media and signage."
    >
      <div className="ea-diagram-caption">CAMPAIGN DISTRIBUTION</div>
      <div className="ea-campaign-tile">
        <span className="ea-small-diamond" />
        <span>Your next campaign</span>
        <ArrowRight size={20} />
      </div>
      <div className="ea-connector" />
      <div className="ea-channel-grid">
        {[
          { icon: Globe2, name: "Websites" },
          { icon: Mail, name: "Email" },
          { icon: MessageCircle, name: "Social" },
          { icon: Smartphone, name: "Signage" },
        ].map(({ icon: Icon, name }) => (
          <span key={name}>
            <Icon size={23} />
            <span>{name}</span>
          </span>
        ))}
      </div>
      <div className="ea-diagram-foot">Across your shopping centers</div>
    </div>
  );
}

function CollaborationDiagram() {
  return (
    <div
      className="ea-feature-visual ea-collaboration"
      role="img"
      aria-label="Your retail team, Engagement Agents and shopping-center partners work together."
    >
      <div className="ea-diagram-caption">BETTER TOGETHER</div>
      <div className="ea-partners">
        <div>
          <Users size={27} />
          <span>Your team</span>
        </div>
        <span className="ea-partner-line" />
        <div>
          <Store size={27} />
          <span>Your centers</span>
        </div>
      </div>
      <div className="ea-team-center">
        <img src="/ea/logo.png" width={330} height={33} alt="" loading="lazy" />
        <p>Your dedicated account manager</p>
      </div>
      <div className="ea-diagram-foot">Shared campaigns. Stronger relationships.</div>
    </div>
  );
}

function ReportingDiagram() {
  return (
    <div
      className="ea-feature-visual ea-reporting"
      role="img"
      aria-label="Reporting brings campaign activity, brand consistency and local discoverability into view."
    >
      <div className="ea-diagram-caption">A CLEARER PICTURE</div>
      <div className="ea-report-lines">
        {[
          { icon: BarChart3, title: "Campaign activity", text: "Tracking & analytics" },
          { icon: Check, title: "Brand consistency", text: "Campaign compliance" },
          { icon: Search, title: "Local discoverability", text: "Search & social sharing" },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <span className="ea-report-icon">
              <Icon size={22} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <ArrowUpRight size={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section className="ea-section ea-features" id="features" aria-labelledby="features-heading">
      <div className="ea-wrap">
        <div className="ea-section-top">
          <div>
            <p className="ea-eyebrow">Built for the way retail works</p>
            <h2 id="features-heading">
              Less coordination.
              <br />
              More connection.
            </h2>
          </div>
          <p className="ea-section-description">
            The tools, visibility and support to make local marketing work across your store
            network.
          </p>
        </div>
        <div className="ea-feature-row">
          <Reveal>
            <DistributionDiagram />
          </Reveal>
          <div className="ea-feature-copy">
            <span className="ea-feature-index">01 / CONNECT</span>
            <h3>
              One campaign.
              <br />
              More places to be seen.
            </h3>
            <p>
              Bring content distribution and contact management into one platform. Make better use
              of your centers’ digital and physical channels, from email to in-center signage.
            </p>
            <ul>
              <li>
                <Check size={15} /> Local marketing opportunities
              </li>
              <li>
                <Check size={15} /> Content distribution & automation
              </li>
              <li>
                <Check size={15} /> One SaaS platform
              </li>
            </ul>
          </div>
        </div>
        <div className="ea-feature-row ea-feature-reverse">
          <Reveal>
            <CollaborationDiagram />
          </Reveal>
          <div className="ea-feature-copy">
            <span className="ea-feature-index">02 / COLLABORATE</span>
            <h3>
              Good relationships.
              <br />
              Better retail marketing.
            </h3>
            <p>
              Bring your team and your shopping-center partners closer together. A dedicated
              Engagement Agents account manager helps you make the most of the platform.
            </p>
            <ul>
              <li>
                <Check size={15} /> Shopping-center collaboration
              </li>
              <li>
                <Check size={15} /> Dedicated account support
              </li>
              <li>
                <Check size={15} /> Less duplicate effort
              </li>
            </ul>
          </div>
        </div>
        <div className="ea-feature-row">
          <Reveal>
            <ReportingDiagram />
          </Reveal>
          <div className="ea-feature-copy">
            <span className="ea-feature-index">03 / UNDERSTAND</span>
            <h3>
              See the activity.
              <br />
              Find the opportunity.
            </h3>
            <p>
              Use reporting and actionable insights to inform your next marketing decision. Support
              consistent campaigns and improve discoverability through your shopping centers.
            </p>
            <ul>
              <li>
                <Check size={15} /> Tracking & analytics
              </li>
              <li>
                <Check size={15} /> Campaign compliance
              </li>
              <li>
                <Check size={15} /> SEO & social sharing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Quote({ quote, featured = false }: { quote: Testimonial; featured?: boolean }) {
  return (
    <figure className={`ea-quote${featured ? " ea-quote-featured" : ""}`}>
      <img
        src={`/ea/logos/${quote.logo}.png`}
        alt={quote.brand}
        width={125}
        height={100}
        loading="lazy"
      />
      <blockquote>“{quote.text}”</blockquote>
      <figcaption>
        <strong>{quote.name}</strong>
        <span>
          {quote.role}, {quote.brand}
        </span>
        <a href={quote.source}>
          Read customer story <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section
      id="stories"
      tabIndex={-1}
      className="ea-section ea-testimonials"
      aria-labelledby="testimonials-heading"
    >
      <div className="ea-wrap">
        <div className="ea-section-top">
          <div>
            <p className="ea-eyebrow">In their words</p>
            <h2 id="testimonials-heading">
              The brands you know.
              <br />
              The teams behind them.
            </h2>
          </div>
          <p className="ea-section-description">
            A little less admin. A lot more possibility.
            <br />
            Hear it from retail marketing teams.
          </p>
        </div>
        <div className="ea-quote-layout">
          <Quote quote={TESTIMONIALS[0]} featured />
          <div className="ea-supporting-quotes">
            {TESTIMONIALS.slice(1, 3).map((quote) => (
              <Quote key={quote.name} quote={quote} />
            ))}
          </div>
        </div>
        <details className="ea-disclosure">
          <summary>
            <span className="ea-when-closed">More customer stories</span>
            <span className="ea-when-open">Fewer customer stories</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="ea-more-quotes">
            {TESTIMONIALS.slice(3).map((quote) => (
              <Quote key={quote.name} quote={quote} />
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

export function Founder() {
  return (
    <section id="our-story" className="ea-section ea-founder" aria-labelledby="story-heading">
      <div className="ea-wrap ea-founder-layout">
        <Reveal className="ea-founder-portrait">
          <img
            src="/ea/sean.jpg"
            alt="Sean Snyder, founder and President of Engagement Agents"
            width={150}
            height={150}
            loading="lazy"
          />
          <span>
            Sean Snyder <span>Founder & President</span>
          </span>
        </Reveal>
        <div>
          <p className="ea-eyebrow">Our story</p>
          <h2 id="story-heading">
            Built by a retailer.
            <br />
            For retailers.
          </h2>
          <p className="ea-lede">
            The challenge was familiar: 85 stores, 85 shopping centers, and too many separate
            conversations.
          </p>
          <p className="ea-muted">
            While leading sales and marketing at Stitch It, Sean Snyder saw how hard it was to
            coordinate campaigns with every shopping center. Engagement Agents launched in 2016 to
            help retailers make better use of the marketing they were already funding.
          </p>
          <a href="https://www.engagementagents.com/our-story" className="ea-text-link">
            Meet Engagement Agents <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function Insights() {
  return (
    <section id="insights" className="ea-section ea-insights" aria-labelledby="insights-heading">
      <div className="ea-wrap">
        <div className="ea-section-top">
          <div>
            <p className="ea-eyebrow">Ideas & perspectives</p>
            <h2 id="insights-heading">A closer look at retail.</h2>
          </div>
          <a href="https://www.engagementagents.com/blogs" className="ea-text-link">
            View all insights <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="ea-insight-grid">
          {INSIGHTS.map((insight) => (
            <article key={insight.source}>
              <a href={insight.source}>
                <div className="ea-insight-image">
                  <img
                    src={`/ea/illustrations/${insight.image}`}
                    width={insight.width}
                    height={insight.height}
                    alt=""
                    loading="lazy"
                  />
                </div>
                <p className="ea-eyebrow">{insight.category}</p>
                <h3>{insight.title}</h3>
                <span className="ea-text-link">
                  Read the story <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="ea-closing" aria-labelledby="closing-heading">
      <div className="ea-wrap ea-closing-inner">
        <div>
          <p className="ea-eyebrow">Your next opportunity is already there</p>
          <h2 id="closing-heading">
            Let’s put your retail
            <br />
            marketing to work.
          </h2>
          <p>Discover what’s possible across your shopping centers.</p>
        </div>
        <div className="ea-closing-actions">
          <a href={DEMO_URL} className="ea-button ea-button-primary">
            Book a Demo <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <a href="mailto:engage@engagementagents.com" className="ea-text-link">
            Let’s talk <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="ea-footer">
      <div className="ea-wrap">
        <div className="ea-footer-grid">
          <div>
            <a href="#top" className="ea-wordmark">
              <img
                src="/ea/logo.png"
                alt="Engagement Agents"
                width={330}
                height={33}
                loading="lazy"
              />
            </a>
            <p>
              The retail marketing opportunity
              <br />
              already inside your leases.
            </p>
            <a href="mailto:engage@engagementagents.com">engage@engagementagents.com</a>
            <a href="tel:+14165777326">+1 416 577 7326</a>
          </div>
          <div>
            <h2>Explore</h2>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <a href="#stories">Testimonials</a>
          </div>
          <div>
            <h2>Find us</h2>
            <address>
              <strong>United States</strong>311 N Market St, Suite 200
              <br />
              Dallas, TX 75202<strong>Canada</strong>24 Eugene St.
              <br />
              Hamilton, ON L8H 2R3
            </address>
          </div>
          <div>
            <h2>Let’s connect</h2>
            <a href={DEMO_URL}>
              Book a Demo <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <Link href="/login">
              Login <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <a href="https://www.engagementagents.com/our-story">Our Story</a>
          </div>
        </div>
        <div className="ea-footer-bottom">
          <span>Engagement Agents · Built around retail.</span>
          <div>
            <a href="https://www.engagementagents.com/privacy-policy">Privacy Policy</a>
            <a href="https://www.engagementagents.com/terms-conditions">Terms & Conditions</a>
            <a href="#top">Back to top ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
