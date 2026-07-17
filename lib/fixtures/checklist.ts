import type { ChecklistItemRow } from "@/lib/types/contract";
import { ME_ID } from "./users";

// A believable pre-flight list - sorted by due_offset (days before move_in).
// Round 3 (section 13.6) - grouped by category (travel, logistics, packing, admin).
export const checklistFixture: ChecklistItemRow[] = [
  // Logistics + admin (further out).
  { id: "C1", user_id: ME_ID, label: "Confirm sublease + send deposit", due_offset: 21, done: true, category: "admin" },
  { id: "C2", user_id: ME_ID, label: "Book flight to SEA", due_offset: 14, done: true, category: "travel" },
  { id: "C3", user_id: ME_ID, label: "Set up direct deposit with Stripe payroll", due_offset: 10, done: false, category: "admin" },
  // Travel + shipping.
  { id: "C4", user_id: ME_ID, label: "Order Orca card (transit)", due_offset: 7, done: false, category: "travel" },
  { id: "C10", user_id: ME_ID, label: "Ship the box you don't want to fly with", due_offset: 7, done: false, category: "logistics" },
  { id: "C11", user_id: ME_ID, label: "Decide: bring the car or fly? Reserve parking if driving", due_offset: 6, done: false, category: "logistics" },
  { id: "C5", user_id: ME_ID, label: "Add renter's insurance", due_offset: 5, done: false, category: "admin" },
  // Packing (short window).
  { id: "C6", user_id: ME_ID, label: "Save Perch offline map of your walk to the office", due_offset: 3, done: false, category: "packing" },
  { id: "C12", user_id: ME_ID, label: "Pack what-to-bring list (laptop, layers, meds, one dress-up outfit)", due_offset: 3, done: false, category: "packing" },
  { id: "C7", user_id: ME_ID, label: "Pack a first-week bag (nothing you can't buy)", due_offset: 2, done: false, category: "packing" },
  { id: "C13", user_id: ME_ID, label: "Print/screenshot boarding pass + sublease address", due_offset: 1, done: false, category: "travel" },
  { id: "C8", user_id: ME_ID, label: "Text your emergency contact your arrival plan", due_offset: 1, done: false, category: "admin" },
];
