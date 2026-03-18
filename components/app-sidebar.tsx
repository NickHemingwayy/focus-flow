"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Compass, Plus, Search } from "lucide-react";
import UsersFileList from "./file-list";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import CreateNoteBtn from "./create-note";
import Link from "next/link";
import PowerSearch from "./power-search";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useRouter } from "next/navigation";
import { useNote } from "@/hooks/use-note";

export function AppSidebar() {
  const router = useRouter();
  const { createNote } = useNote();

  // Open explorer on CMD+E
  useHotkey("Mod+E", () => router.push("/explorer"));
  useHotkey("Mod+Shift+F", () => createNote());

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center gap-2 px-2 justify-between">
        <span className="font-bold ms-3">Wripp</span>
        <CreateNoteBtn />
      </SidebarHeader>
      <SidebarContent className="px-2 flex flex-col gap-0">
        <PowerSearch>
          <Button
            variant="ghost"
            className="justify-start text-muted-foreground font-light"
          >
            <Search /> Search
          </Button>
        </PowerSearch>
        <Button
          variant="ghost"
          className="justify-start text-muted-foreground font-light"
          asChild
        >
          <Link href="/explorer">
            <Compass /> Explorer
          </Link>
        </Button>

        <UsersFileList />
        <ThemeToggle />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
