import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MarketingLayout } from '@/layouts/PageLayouts';

const SITE = 'https://esportsduniya.in';
const UPDATED = 'November 2026';

function LegalSection({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-accent">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Meta({ title, description, path }) {
  return (
    <Helmet>
      <title>{`${title} | Esportsduniya`}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${SITE}${path}`} />
    </Helmet>
  );
}

const Mail = ({ a }) => (
  <a href={`mailto:${a}`} className="font-semibold text-foreground">{a}</a>
);

export function PrivacyPolicy() {
  return (
    <MarketingLayout title="Privacy Policy" description={`Last updated: ${UPDATED}`}>
      <Meta
        title="Privacy Policy"
        path="/privacy"
        description="How Esportsduniya collects, uses and protects your data, including cookies and Google AdSense advertising."
      />
      <p>
        This Privacy Policy explains what information Esportsduniya ("we", "us", "our"), operating at{' '}
        <strong className="text-foreground">esportsduniya.in</strong>, collects when you use our website, how we use it,
        and the choices you have. By using the site you agree to the practices described here.
      </p>

      <LegalSection title="Information we collect">
        <p><strong className="text-foreground">Information you give us.</strong> If you create an account we store your username, a hashed (never plain-text) password, an optional email address, an avatar, your favourite sports and teams, your predictions, FanPoints and activity history. If you contact us, we keep your message and email address so we can reply.</p>
        <p><strong className="text-foreground">Information collected automatically.</strong> Like most websites, our servers and analytics tools receive your IP address, browser type, device type, pages viewed, referring page and approximate location (city or country level). We do not collect real names, phone numbers or payment card numbers; payments, where offered, are processed by Stripe.</p>
        <p><strong className="text-foreground">Local storage.</strong> We store preferences (followed teams, theme, onboarding state) in your browser's local storage so the site remembers you. You can clear it at any time from your browser settings.</p>
      </LegalSection>

      <LegalSection title="How we use information">
        <ul className="list-disc space-y-1 pl-5">
          <li>To provide, maintain and secure the service and to authenticate you.</li>
          <li>To personalise your feed and power the Prediction Arena, leaderboards, badges and notifications you opt into.</li>
          <li>To understand how the site is used and to fix bugs and improve features.</li>
          <li>To show advertising that helps pay for the free parts of the site.</li>
          <li>To respond to your questions and to prevent fraud and abuse.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="Cookies and advertising (Google AdSense)">
        <p>We use cookies and similar technologies for essential site functions, analytics and advertising.</p>
        <p>
          Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or
          other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on
          your visit to our site and/or other sites on the Internet.
        </p>
        <p>
          You may opt out of personalised advertising by visiting{' '}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.
          You can also opt out of some third-party vendors' use of cookies for personalised advertising at{' '}
          <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>. To learn how Google
          uses data from sites that use its services, see{' '}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a>.
        </p>
        <p>
          Visitors in the European Economic Area, the United Kingdom and Switzerland are shown a consent message so they
          can accept or decline cookies used for personalised ads. You can change your choice at any time using the
          privacy settings link provided by that message, or by clearing cookies in your browser.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>We rely on trusted providers to run the site: sports data providers (such as CricAPI, API-Football and TheSportsDB), Google Gemini for AI-written match narratives, Google Analytics for usage statistics, Google AdSense for advertising, Stripe for payments, Cloudflare for CDN and security, Render and Vercel for hosting, and MongoDB Atlas for storage. These providers process data under their own privacy policies.</p>
      </LegalSection>

      <LegalSection title="Data retention and security">
        <p>We keep account data for as long as your account is active. You can ask us to delete your account and associated data at any time. We use HTTPS, hashed passwords and access controls, but no method of transmission over the Internet is 100% secure.</p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>Depending on where you live (including India's Digital Personal Data Protection Act, the GDPR and the CCPA/CPRA) you may have the right to access, correct, delete or export your personal data, to withdraw consent, and to object to certain processing. Email us at <Mail a="privacy@esportsduniya.in" /> and we will respond within 30 days.</p>
      </LegalSection>

      <LegalSection title="Children">
        <p>Esportsduniya is not directed at children under 13 and we do not knowingly collect their personal information. If you believe a child has given us data, contact us and we will delete it.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>We may update this policy from time to time. The "Last updated" date above shows the latest revision. Continued use of the site after a change means you accept the updated policy.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about privacy? Email <Mail a="privacy@esportsduniya.in" /> or visit our <Link to="/contact" className="text-accent hover:underline">Contact page</Link>.</p>
      </LegalSection>
    </MarketingLayout>
  );
}

export function TermsOfService() {
  return (
    <MarketingLayout title="Terms of Service" description={`Last updated: ${UPDATED}`}>
      <Meta
        title="Terms of Service"
        path="/terms"
        description="The rules for using Esportsduniya, including accounts, virtual FanPoints, acceptable use and disclaimers."
      />
      <LegalSection title="1. Acceptance of terms">
        <p>By accessing or using Esportsduniya (the "Service") you agree to be bound by these Terms and our <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>. If you do not agree, please do not use the Service.</p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>Esportsduniya provides live sports scores, standings, news, AI-generated analysis, history features and free-to-play prediction games that use virtual FanPoints. FanPoints have no cash value, cannot be purchased for or exchanged for money, and are not a form of gambling.</p>
      </LegalSection>

      <LegalSection title="3. Accounts">
        <p>You are responsible for your account credentials and for activity under your account. You must provide accurate information and be at least 13 years old. We may suspend or remove accounts that violate these Terms.</p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not scrape, overload, reverse-engineer or attempt to disrupt the Service.</li>
          <li>Do not post unlawful, hateful, harassing or misleading content.</li>
          <li>Do not manipulate leaderboards, create fake accounts or use bots.</li>
          <li>Do not click on ads for any reason other than genuine interest, or encourage others to do so.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Content and intellectual property">
        <p>Site design, code, original articles and branding belong to Esportsduniya. Team names, logos and scores belong to their respective owners and are used for informational purposes. Third-party news headlines link to their original publishers.</p>
      </LegalSection>

      <LegalSection title="6. Accuracy disclaimer">
        <p>Scores, statistics, predictions and AI analysis are provided "as is" and may be delayed, estimated or inaccurate. Do not rely on them for betting or financial decisions. Esportsduniya is not a gambling or betting service.</p>
      </LegalSection>

      <LegalSection title="7. Advertising and third-party links">
        <p>The Service displays advertising, including Google AdSense, and links to third-party sites. We do not control or endorse third-party content and are not responsible for it.</p>
      </LegalSection>

      <LegalSection title="8. Limitation of liability">
        <p>To the fullest extent permitted by law, Esportsduniya is not liable for any indirect, incidental or consequential damages arising from your use of the Service. The Service is provided without warranties of any kind.</p>
      </LegalSection>

      <LegalSection title="9. Changes and governing law">
        <p>We may modify these Terms at any time; continued use means you accept the changes. These Terms are governed by the laws of India.</p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>Email <Mail a="legal@esportsduniya.in" />.</p>
      </LegalSection>
    </MarketingLayout>
  );
}

export function AboutPage() {
  return (
    <MarketingLayout title="About Esportsduniya" description="Live sports intelligence for fans worldwide.">
      <Meta
        title="About Us"
        path="/about"
        description="Esportsduniya is an independent sports platform offering live scores, standings, original analysis and free prediction games for cricket, football, NBA, tennis and F1."
      />
      <p>
        Esportsduniya ("sports world" in Hindi/Urdu) is an independent sports platform built for fans who want more than a
        scoreboard. We combine real-time scores from reputable data providers with clear explanations, standings, history
        and free-to-play prediction games, so you can follow the matches you love and understand what is happening and why.
      </p>

      <LegalSection title="Our mission">
        <p>To make following sport simpler, faster and more insightful — especially for the cricket and football communities in India and around the world — without paywalls on the basics or intrusive experiences.</p>
      </LegalSection>

      <LegalSection title="What you will find here">
        <ul className="list-disc space-y-1 pl-5">
          <li><Link to="/" className="text-accent hover:underline">Live scores</Link> for cricket (including IPL), football, NBA, tennis and Formula 1.</li>
          <li><Link to="/standings" className="text-accent hover:underline">League standings</Link> and tournament hubs such as <Link to="/cricket/ipl-2026" className="text-accent hover:underline">IPL 2026</Link> and the <Link to="/football/premier-league" className="text-accent hover:underline">Premier League</Link>.</li>
          <li><Link to="/blog" className="text-accent hover:underline">Sports news and analysis</Link> with previews, results and explainers.</li>
          <li><Link to="/timemachine" className="text-accent hover:underline">Time Machine</Link> — relive legendary matches and moments from sports history.</li>
          <li><Link to="/arena" className="text-accent hover:underline">Prediction Arena</Link>, a <Link to="/quiz" className="text-accent hover:underline">daily quiz</Link> and fantasy challenges that use virtual points only — never real money.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How our data and AI work">
        <p>Scores and fixtures come from third-party sports data APIs and are refreshed continuously. Where a provider cannot supply a live feed, we may show an AI-estimated figure and clearly label it as such. AI is used to draft match narratives, previews and summaries from real match data; we review the approach regularly and correct errors that are reported to us. Read more in our <Link to="/editorial-policy" className="text-accent hover:underline">Editorial Policy</Link>.</p>
      </LegalSection>

      <LegalSection title="How we are funded">
        <p>Esportsduniya is supported by advertising (Google AdSense) and optional Pro subscriptions. Advertising never influences our scores, rankings or editorial choices, and ads are always separate from content.</p>
      </LegalSection>

      <LegalSection title="Get in touch">
        <p>We love feedback, corrections and partnership ideas. Reach us at <Mail a="hello@esportsduniya.in" /> or through the <Link to="/contact" className="text-accent hover:underline">Contact page</Link>.</p>
      </LegalSection>
    </MarketingLayout>
  );
}

export function ContactPage() {
  return (
    <MarketingLayout title="Contact Us" description="We usually reply within 2 business days.">
      <Meta
        title="Contact Us"
        path="/contact"
        description="Contact the Esportsduniya team for support, corrections, advertising, partnerships or privacy requests."
      />
      <p>
        Have a question, a correction or a suggestion? We read every message. Please include relevant links or screenshots
        so we can help quickly.
      </p>
      <LegalSection title="General inquiries & support">
        <p><Mail a="hello@esportsduniya.in" /> — account help, feature requests, bug reports.</p>
      </LegalSection>
      <LegalSection title="Corrections & editorial">
        <p><Mail a="editor@esportsduniya.in" /> — report an incorrect score, stat or article. See our <Link to="/editorial-policy" className="text-accent hover:underline">Editorial Policy</Link>.</p>
      </LegalSection>
      <LegalSection title="Privacy & data requests">
        <p><Mail a="privacy@esportsduniya.in" /> — access, correction or deletion of your data.</p>
      </LegalSection>
      <LegalSection title="Advertising & partnerships">
        <p><Mail a="partners@esportsduniya.in" /> — sponsorships, data partnerships and media enquiries.</p>
      </LegalSection>
      <LegalSection title="Response time">
        <p>We aim to respond within 2 business days (Monday–Friday, India Standard Time).</p>
      </LegalSection>
      <p className="mt-8"><Link to="/" className="text-accent hover:underline">← Back to home</Link></p>
    </MarketingLayout>
  );
}

export function EditorialPolicy() {
  return (
    <MarketingLayout title="Editorial Policy" description={`How we create and correct content. Last updated: ${UPDATED}`}>
      <Meta
        title="Editorial Policy"
        path="/editorial-policy"
        description="How Esportsduniya sources data, uses AI responsibly, labels estimates, handles corrections and keeps advertising separate from editorial content."
      />
      <LegalSection title="Accuracy and sourcing">
        <p>Live scores, fixtures and standings come from established sports data providers. We cross-check and cache results to avoid showing stale data, and we show the data source and freshness where possible. News items summarise headlines and always link to the original publisher.</p>
      </LegalSection>
      <LegalSection title="Use of AI">
        <p>We use AI models to draft match narratives, previews and explainers from verified match data. AI-generated text is labelled, is limited to the data provided to it, and is not used to invent quotes, injuries or transfers. Estimated scores are always marked as estimates.</p>
      </LegalSection>
      <LegalSection title="Independence from advertising">
        <p>Advertising and sponsorships never influence coverage, rankings or predictions. Ads are clearly separated from editorial content and we do not publish paid content disguised as news.</p>
      </LegalSection>
      <LegalSection title="Predictions and gambling">
        <p>Predictions on Esportsduniya are for entertainment and use virtual FanPoints. We do not promote betting, and nothing on this site is betting or financial advice.</p>
      </LegalSection>
      <LegalSection title="Corrections">
        <p>If you spot an error, email <Mail a="editor@esportsduniya.in" />. We verify reports and correct confirmed errors promptly.</p>
      </LegalSection>
      <p className="mt-8"><Link to="/about" className="text-accent hover:underline">About Esportsduniya →</Link></p>
    </MarketingLayout>
  );
}

export function DisclaimerPage() {
  return (
    <MarketingLayout title="Disclaimer" description={`Last updated: ${UPDATED}`}>
      <Meta
        title="Disclaimer"
        path="/disclaimer"
        description="Esportsduniya's disclaimer on score accuracy, AI content, predictions, trademarks and third-party links."
      />
      <LegalSection title="Information only">
        <p>All content on Esportsduniya is provided for general information and entertainment. Scores and statistics may be delayed or contain errors; always check the official source for critical decisions.</p>
      </LegalSection>
      <LegalSection title="No betting or financial advice">
        <p>Predictions, odds-style insights and AI analysis are not betting, investment or professional advice. Esportsduniya does not accept wagers or operate a gambling service. FanPoints are virtual and have no monetary value.</p>
      </LegalSection>
      <LegalSection title="Trademarks">
        <p>All team names, league names, logos and trademarks belong to their respective owners. Esportsduniya is not affiliated with, endorsed by or sponsored by any league, team or governing body unless explicitly stated.</p>
      </LegalSection>
      <LegalSection title="External links">
        <p>We link to third-party websites for convenience and are not responsible for their content or practices.</p>
      </LegalSection>
      <p className="mt-8"><Link to="/terms" className="text-accent hover:underline">Terms of Service →</Link></p>
    </MarketingLayout>
  );
}
