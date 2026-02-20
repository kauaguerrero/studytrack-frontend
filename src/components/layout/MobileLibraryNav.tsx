'use client'

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Certifique-se de ter shadcn sheet
import { Menu } from "lucide-react";
import { SidebarContent } from "./PortalSidebar"; // Reutiliza seu componente existente
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/roles";
import { useState } from "react";

interface MobileNavProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
}

export function MobileLibraryNav(props: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 p-4 sticky top-0 z-30">
      <div className="font-bold text-slate-800">
        Study<span className="text-blue-600">Track</span>
      </div>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-touch" aria-label="Abrir menu de navegação">
            <Menu className="text-slate-600" aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          {/* Passamos o callback para fechar ao clicar num link */}
          <SidebarContent {...props} onCloseMobile={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}