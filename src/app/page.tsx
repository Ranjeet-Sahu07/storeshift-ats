import { Navbar } from '@/components/marketing/navbar';
import { Hero } from '@/components/marketing/hero';
import { OpenPositions } from '@/components/marketing/open-positions';
import { Roadmap } from '@/components/marketing/roadmap';
import { TechStack } from '@/components/marketing/tech-stack';
import { HiringProcess } from '@/components/marketing/hiring-process';
import { Benefits } from '@/components/marketing/benefits';
import { LifeAt } from '@/components/marketing/life-at';
import { CertificatePreview } from '@/components/marketing/certificate-preview';
import { FAQ } from '@/components/marketing/faq';
import { Footer } from '@/components/marketing/footer';

export default function CareersHomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <OpenPositions />
      <Roadmap />
      <TechStack />
      <HiringProcess />
      <Benefits />
      <LifeAt />
      <CertificatePreview />
      <FAQ />
      <Footer />
    </main>
  );
}
