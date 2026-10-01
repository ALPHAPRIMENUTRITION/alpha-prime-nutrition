import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listFoods } from "@/lib/data/nutrition";
import { FoodCatalog } from "@/components/nutrition/food-catalog";

export const metadata: Metadata = { title: "Alimentos" };

export default async function FoodsPage() {
  await requireRole("coach");
  const foods = await listFoods();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/coach/planes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Planes
      </Link>
      <header>
        <p className="eyebrow">Nutrición</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Alimentos</h1>
      </header>
      <FoodCatalog initial={foods} />
    </div>
  );
}
