"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import Nav, { Tab } from "@/components/Nav";
import WorkSection from "@/components/WorkSection";
import ProjectsSection from "@/components/ProjectsSection";
import WritingSection from "@/components/WritingSection";
import Footer from "@/components/Footer";

const sectionMap: Record<Tab, React.ReactNode> = {
  work: <WorkSection />,
  projects: <ProjectsSection />,
  writing: <WritingSection />,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("work");

  return (
    <main className="max-w-2xl mx-auto px-6 w-full">
      <Header />

      <Nav active={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {sectionMap[activeTab]}
        </motion.div>
      </AnimatePresence>

      <Footer />
    </main>
  );
}
