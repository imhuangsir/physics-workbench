"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Unit = { name: string; k: number }; // k = 每个该单位含多少基准单位
const CATS: { label: string; units: Unit[] }[] = [
  { label: "长度", units: [{ name: "km", k: 1000 }, { name: "m", k: 1 }, { name: "dm", k: 0.1 }, { name: "cm", k: 0.01 }, { name: "mm", k: 0.001 }, { name: "μm", k: 1e-6 }] },
  { label: "质量", units: [{ name: "t", k: 1000 }, { name: "kg", k: 1 }, { name: "g", k: 0.001 }, { name: "mg", k: 1e-6 }] },
  { label: "时间", units: [{ name: "h", k: 3600 }, { name: "min", k: 60 }, { name: "s", k: 1 }, { name: "ms", k: 0.001 }] },
  { label: "速度", units: [{ name: "m/s", k: 1 }, { name: "km/h", k: 1 / 3.6 }] },
  { label: "体积", units: [{ name: "m³", k: 1 }, { name: "L", k: 1e-3 }, { name: "dm³", k: 1e-3 }, { name: "mL", k: 1e-6 }, { name: "cm³", k: 1e-6 }] },
  { label: "密度", units: [{ name: "kg/m³", k: 1 }, { name: "g/cm³", k: 1000 }] },
];

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e6 || a < 1e-4) return n.toExponential(3).replace(/e([+-])(\d)$/, "e$10$2");
  return parseFloat(n.toPrecision(6)).toString();
}

export default function ConverterPage() {
  const [ci, setCi] = useState(0);
  const [from, setFrom] = useState(1);
  const [val, setVal] = useState("1");
  const cat = CATS[ci];
  const base = (parseFloat(val) || 0) * cat.units[from].k;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/student/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> 实用小工具</Link>
        <SectionLabel className="mt-2">单位换算器</SectionLabel>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATS.map((c, i) => <Button key={c.label} size="sm" variant={i === ci ? "default" : "outline"} onClick={() => { setCi(i); setFrom(1 % c.units.length); }}>{c.label}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="w-32" />
        <div className="flex flex-wrap gap-1.5">
          {cat.units.map((u, i) => <button key={u.name} onClick={() => setFrom(i)} className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${i === from ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{u.name}</button>)}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {cat.units.map((u) => (
          <div key={u.name} className={`flex items-center justify-between rounded-2xl border p-3 ${u.name === cat.units[from].name ? "border-primary bg-primary/5" : ""}`}>
            <span className="text-sm text-muted-foreground">{u.name}</span>
            <span className="num font-semibold">{fmt(base / u.k)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">输入数值、选好单位，其余单位会实时换算。常用换算：1 m = 100 cm，1 kg = 1000 g，1 m/s = 3.6 km/h，1 g/cm³ = 1000 kg/m³，1 L = 1 dm³ = 1000 cm³。</p>
    </div>
  );
}
