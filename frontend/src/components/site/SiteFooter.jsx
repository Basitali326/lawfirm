import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="bg-[#111b2d] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3 text-white"><span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#9a7437] font-serif font-bold text-[#dfc18b]">AN</span><span className="font-serif text-xl">Dr Alaa Nasir</span></div>
          <p className="mt-4 text-sm leading-7 text-slate-400">Clear legal guidance, strategic advocacy, and practical resources for clients across the UAE.</p>
        </div>
        <div><h3 className="font-semibold text-white">Profile</h3><div className="mt-4 grid gap-3 text-sm"><Link href="/profile-lawyer">Dr Alaa Nasir</Link><Link href="/expertise">Expertise</Link><Link href="/articles">Articles</Link></div></div>
        <div><h3 className="font-semibold text-white">Resources</h3><div className="mt-4 grid gap-3 text-sm"><Link href="/ebooks">E-Books</Link><Link href="/articles">Articles</Link><Link href="/contact">Consultation</Link></div></div>
        <div>
          <h3 className="font-semibold text-white">Contact</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              Tbarak Tower, Office 905, Floor 9, Sharjah Al Mamzer, opposite Al Mamzer Corniche
            </span>
            <a href="tel:+971585373400" className="flex gap-2 hover:text-white">
              <Phone className="h-4 w-4" /> +971 58 537 3400
            </a>
            <a href="mailto:dralaa2016@gmail.com" className="flex gap-2 hover:text-white">
              <Mail className="h-4 w-4" /> dralaa2016@gmail.com
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">© 2026 Dr Alaa Nasir. All rights reserved.</div>
    </footer>
  );
}
