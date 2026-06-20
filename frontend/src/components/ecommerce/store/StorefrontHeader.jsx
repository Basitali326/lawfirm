"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const links = [
  ["Book", "/services"],
  ["Profile", "/profile-lawyer"],
  ["Expertise", "/expertise"],
  ["E-Books", "/ebooks"],
  ["Articles", "/articles"],
];

export default function StorefrontHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#d7c9ad] bg-[#fffdf8]/95 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-[#15233b]">
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#9a7437] bg-[#15233b] font-serif text-lg font-bold text-[#dfc18b]">
            AN
          </span>
          <span>
            <strong className="block font-serif text-xl leading-none">Dr Alaa Nasir</strong>
            <small className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7437]">Legal Consultant</small>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#26344c] lg:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="transition hover:text-[#9a7437]">{label}</Link>
          ))}
          <Button asChild className="rounded-none bg-[#9a7437] px-6 text-white hover:bg-[#7f5e2c]">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </nav>

        <button className="p-2 lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-[#e6dcc9] bg-[#fffdf8] px-5 py-5 lg:hidden">
          <div className="flex flex-col gap-4 text-sm font-semibold text-[#26344c]">
            {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
            <Link href="/contact" onClick={() => setOpen(false)}>Contact Us</Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
