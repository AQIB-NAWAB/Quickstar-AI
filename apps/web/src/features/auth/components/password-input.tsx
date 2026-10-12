"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PasswordInput({ value, onChange, isNew = false }: { value: string; onChange: (value: string) => void; isNew?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className="relative"><Input label="Password" name="password" type={visible ? "text" : "password"} autoComplete={isNew ? "new-password" : "current-password"} required minLength={8} value={value} onChange={event => onChange(event.target.value)} placeholder={isNew ? "At least 8 characters" : "Enter your password"} className="pr-12 h-11 rounded-8 text-[13px]" /><button type="button" onClick={() => setVisible(current => !current)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute right-1 bottom-0 h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-heat-100">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>;
}
