const COMPANY = "https://www.engagementagents.com";
export const DEMO_URL = `${COMPANY}/book-a-demo`;
export const SOURCE = `${COMPANY}/`;

export interface Customer {
  slug: string;
  name: string;
  source: string;
}
export interface Result {
  value: string;
  label: string;
  context: string;
  image: string;
  width: number;
  height: number;
  source: string;
}
export interface Testimonial {
  name: string;
  role: string;
  brand: string;
  logo: string;
  text: string;
  source: string;
}
export interface Insight {
  title: string;
  category: string;
  image: string;
  width: number;
  height: number;
  source: string;
}

const customerNames = [
  ["nordstrom-rack", "Nordstrom Rack"],
  ["levi", "Levi’s"],
  ["guess", "GUESS"],
  ["pandora", "Pandora"],
  ["under-armour", "Under Armour"],
  ["lacoste", "Lacoste"],
  ["converse", "Converse"],
  ["timberland", "Timberland"],
  ["oakley", "Oakley"],
  ["nespresso", "Nespresso"],
  ["asics", "ASICS"],
  ["the-container-store", "The Container Store"],
  ["7-for-all-mankind", "7 For All Mankind"],
  ["aeropostale", "Aéropostale"],
  ["ben-bridge", "Ben Bridge"],
  ["brooks-brothers", "Brooks Brothers"],
  ["buckle", "Buckle"],
  ["caryl-baker-visage", "Caryl Baker Visage"],
  ["chatters", "Chatters"],
  ["daniels-jewelers", "Daniel’s Jewelers"],
  ["dr-marten", "Dr. Martens"],
  ["fabletics", "Fabletics"],
  ["fragrance-outlet", "Fragrance Outlet"],
  ["kipling", "Kipling"],
  ["koko-black", "Koko Black"],
  ["laubman-pank", "Laubman & Pank"],
  ["lindt", "Lindt"],
  ["lovesac", "Lovesac"],
  ["lucky-brand", "Lucky Brand"],
  ["nautica", "Nautica"],
  ["opsm", "OPSM"],
  ["pearle-vision", "Pearle Vision"],
  ["perfumania", "Perfumania"],
  ["psycho-bunny", "Psycho Bunny"],
  ["splendid", "Splendid"],
  ["stitch-it", "Stitch It"],
  ["sunglass-hut", "Sunglass Hut"],
  ["sur-la-table", "Sur La Table"],
  ["tbooth", "Tbooth wireless"],
  ["tempur-pedic", "Tempur-Pedic"],
  ["the-cosmetics-company-store", "The Cosmetics Company Store"],
  ["the-vitamin-shoppe", "The Vitamin Shoppe"],
  ["tommy-bahama", "Tommy Bahama"],
  ["untuckit", "UNTUCKit"],
  ["vera-bradley", "Vera Bradley"],
  ["wirelesswave", "WIRELESSWAVE"],
] as const;
export const CUSTOMERS: Customer[] = customerNames.map(([slug, name]) => ({
  slug,
  name,
  source: `${COMPANY}/#featured-customers`,
}));

export const RESULTS: [Result, ...Result[]] = [
  {
    value: "$26M",
    label: "in annual lease optimizations",
    context: "Marketing costs identified and optimized for a 1,000-store retailer.",
    image: "success-1.png",
    width: 167,
    height: 195,
    source: `${COMPANY}/#success-stories`,
  },
  {
    value: "29%",
    label: "increase in traffic",
    context: "More in-store and online traffic for a 30-store retailer.",
    image: "success-2.png",
    width: 233,
    height: 195,
    source: `${COMPANY}/#success-stories`,
  },
  {
    value: "5%",
    label: "increase in sales",
    context: "A 100-store retailer activated marketing channels it already paid for.",
    image: "success-3.png",
    width: 167,
    height: 192,
    source: `${COMPANY}/#success-stories`,
  },
  {
    value: "$218K",
    label: "in annual savings",
    context: "Time, salaries and resources saved by a 140-store retailer.",
    image: "success-4.png",
    width: 167,
    height: 189,
    source: `${COMPANY}/#success-stories`,
  },
];

export const BENEFITS = [
  {
    title: "Reclaim traffic & sales",
    body: "Reach shoppers through the digital and physical media networks your shopping centers already provide.",
    label: "Calculate ROI",
    href: `${COMPANY}/calculate-roi`,
  },
  {
    title: "Protect your share of attention",
    body: "Put your campaigns in front of local shoppers alongside the other retailers in your centers.",
    label: "Calculate your losses",
    href: `${COMPANY}/calculate-your-losses`,
  },
  {
    title: "Make your leases work harder",
    body: "Understand and activate the marketing opportunities included in your lease obligations.",
    label: "Explore lease optimization",
    href: `${COMPANY}/optimized-leases`,
  },
  {
    title: "Keep your brand consistent",
    body: "Help keep campaigns current, correct and compliant across your shopping centers.",
    label: "Check your compliance",
    href: `${COMPANY}/are-you-compliant`,
  },
  {
    title: "Give your team time back",
    body: "Reduce duplicate work and free your corporate and store teams to focus on customers.",
    label: "See your savings",
    href: `${COMPANY}/see-my-savings`,
  },
];

// Verbatim excerpts from the published testimonials; ellipses mark omitted text.
export const TESTIMONIALS: [Testimonial, ...Testimonial[]] = [
  {
    name: "Courtney P.",
    role: "Senior Marketing Planner",
    brand: "Nordstrom Rack",
    logo: "nordstrom-rack",
    text: "Engagement Agents helps Nordstrom Rack streamline our local marketing outreach program and process, allowing our team to shift some of our focus to other business needs. …",
    source: `${COMPANY}/#testimonials`,
  },
  {
    name: "Justin B.",
    role: "Senior Marketing & Communications Manager",
    brand: "UNOde50",
    logo: "uno-de-50",
    text: "During our pilot, Engagement Agents helped UNOde50 increase store traffic by 29%.",
    source: `${COMPANY}/#testimonials`,
  },
  {
    name: "Daniel P.",
    role: "Senior Director, Marketing",
    brand: "WIRELESSWAVE",
    logo: "wirelesswave",
    text: "What would take us days or even weeks to accomplish, now takes minutes with Engagement Agents!",
    source: `${COMPANY}/#testimonials`,
  },
  {
    name: "Jennifer B.",
    role: "President",
    brand: "Stitch It",
    logo: "stitch-it",
    text: "It’s so much easier with Engagement Agents! Now it’s a one-stop process.",
    source: `${COMPANY}/#testimonials`,
  },
  {
    name: "Jordan K.",
    role: "Marketing Coordinator",
    brand: "Indochino",
    logo: "indochino",
    text: "Engaging with our shopping center marketing partners is important to us, in order to drive awareness of Indochino and more traffic & sales. Engagement Agents helps us achieve this with ease!",
    source: `${COMPANY}/#testimonials`,
  },
  {
    name: "Michael F.",
    role: "Marketing Communications",
    brand: "Bluenotes",
    logo: "bluenotes",
    text: "Engagement Agents makes it easy to promote Bluenotes marketing campaigns throughout our shopping centres’ marketing channels, in order to drive more traffic and sales to Bluenotes!",
    source: `${COMPANY}/#testimonials`,
  },
];

export const INSIGHTS: Insight[] = [
  {
    title: "How Engagement Agents optimizes marketing campaigns",
    category: "Innovator profile",
    image: "insight-coresight.jpg",
    width: 1000,
    height: 500,
    source: `${COMPANY}/blogs/post/engagement-agents-optimizes-marketing-campaigns`,
  },
  {
    title: "Making mall marketing more effective",
    category: "Retail perspective",
    image: "insight-mall-marketing.png",
    width: 1000,
    height: 500,
    source: `${COMPANY}/blogs/post/making-mall-marketing-more-effective`,
  },
  {
    title: "Among 50 startups powering the new retail world",
    category: "Industry recognition",
    image: "insight-discovery.jpg",
    width: 532,
    height: 298,
    source: `${COMPANY}/blogs/post/engagement-agents-named-among-50-global-tech-start-ups-powering-the-new-retail-world`,
  },
];

export const PROCESS = [
  {
    title: "Your campaigns",
    body: "Promotions, new arrivals, events and loyalty programs. Start with what makes your stores worth visiting.",
  },
  {
    title: "One connected platform",
    body: "Engagement Agents brings content distribution, contact management and reporting together.",
  },
  {
    title: "Your shopping centers",
    body: "Activate websites, email, apps, social media, signage and physical marketing opportunities.",
  },
  {
    title: "Return on engagement",
    body: "Work toward more traffic and sales, better compliance, and savings in time and resources.",
  },
];

export const NAV_LINKS = [
  { label: "How We Help", href: "#why" },
  { label: "Results", href: "#proof" },
  { label: "How It Works", href: "#how" },
  { label: "Our Story", href: "#our-story" },
  { label: "Insights", href: "#insights" },
];
