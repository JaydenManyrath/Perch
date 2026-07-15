import type { ChecklistItemRow } from "@/lib/types/contract";
import { ME_ID } from "./users";

// A believable pre-flight list — sorted by due_offset (days before move_in).
export const checklistFixture: ChecklistItemRow[] = [
  { id: "C1", user_id: ME_ID, label: "Confirm sublease + send deposit", due_offset: 21, done: true },
  { id: "C2", user_id: ME_ID, label: "Book flight to SEA", due_offset: 14, done: true },
  { id: "C3", user_id: ME_ID, label: "Set up direct deposit with Stripe payroll", due_offset: 10, done: false },
  { id: "C4", user_id: ME_ID, label: "Order Orca card (transit)", due_offset: 7, done: false },
  { id: "C5", user_id: ME_ID, label: "Add renter's insurance", due_offset: 5, done: false },
  { id: "C6", user_id: ME_ID, label: "Save Perch offline map of your walk to the office", due_offset: 3, done: false },
  { id: "C7", user_id: ME_ID, label: "Pack a first-week bag (nothing you can't buy)", due_offset: 2, done: false },
  { id: "C8", user_id: ME_ID, label: "Text your emergency contact your arrival plan", due_offset: 1, done: false },
];
