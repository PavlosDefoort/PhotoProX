import React from "react";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Footer } from "./Footer";
import { Features } from "./features/Features";
import { Samples } from "./samples/Samples";
import { OpenSource } from "./open-source/OpenSource";
import { Plan } from "./Plan";

export const Landing: React.FC = () => {
  return (
    <div>
      <Header />
      <Hero />
      <Features />
      <Samples />
      <OpenSource />
      <Plan />
      <Footer />
    </div>
  );
};
