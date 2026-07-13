import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PainPoints } from "@/components/landing/PainPoints";
import { Benefits } from "@/components/landing/Benefits";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Integrators } from "@/components/landing/Integrators";
import { Alerts } from "@/components/landing/Alerts";
import { Trial } from "@/components/landing/Trial";
import { Payment } from "@/components/landing/Payment";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PainPoints />
        <Benefits />
        <HowItWorks />
        <Integrators />
        <Alerts />
        <Trial />
        <Payment />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
