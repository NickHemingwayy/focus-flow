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

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center gap-2 px-2 justify-between">
        <span className="font-bold ms-3">Wripp</span>
        <CreateNoteBtn />
      </SidebarHeader>
      <SidebarContent className="px-2 flex flex-col gap-2">
        <Button variant="ghost" className="justify-start text-muted-foreground">
          <Search /> Search
        </Button>
        <Button
          variant="ghost"
          className="justify-start text-muted-foreground"
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
