"use client";

import { ThreadList } from "@/components/thread-list";
import { Button } from "@/components/ui/button";
import { PanelLeftIcon, LogOutIcon } from "lucide-react";
import { LogoImg } from "@/components/icons/logo-img"
import { type FC } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";

type AssistantSidebarProps = {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
};

export const AssistantSidebar: FC<AssistantSidebarProps> = ({ isOpen, setIsOpen }) => {
    const { logout } = useAuth();

    return (
        <>
            {/* Toggle Button - Always visible */}
            <Button
                variant="ghost"
                size="icon"
                className="group fixed top-3 left-3 z-50 cursor-ew-resize"
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? "Close sidebar" : "Open sidebar"}
            >
                <LogoImg className="block group-hover:hidden size-9" />
                <PanelLeftIcon className="hidden group-hover:block size-5" />
            </Button>

            {/* Overlay - Mobile Only */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                style={{ borderRight: "1px solid oklch(0.922 0 0)" }}
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen flex-shrink-0 transform bg-background transition-all duration-300 ease-in-out",
                    isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full",
                    "md:static"
                )}
            >
                {isOpen && (
                    <div className="flex h-full flex-col p-2 pt-16 md:pt-14">
                        {/* Thread List */}
                        <div className="flex-1 overflow-y-auto">
                            <ThreadList />
                        </div>

                        {/* Theme Switcher & Logout */}
                        <div className="border-t border-border -mx-2 px-2 pt-2 space-y-1">
                            <ThemeSwitcher />

                            {/* Logout Button */}
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 cursor-pointer text-muted-foreground hover:text-foreground h-auto"
                                onClick={logout}
                            >
                                <div className="relative flex items-center justify-center size-4 shrink-0">
                                    <LogOutIcon className="size-4" />
                                </div>
                                Log out
                            </Button>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
};
