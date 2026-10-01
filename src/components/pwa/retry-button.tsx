"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui";

export function RetryButton() {
  return (
    <Button type="button" size="lg" onClick={() => location.reload()}>
      <RotateCw size={18} /> Reintentar
    </Button>
  );
}
