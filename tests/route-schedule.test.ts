import { describe, expect, it } from "vitest";
import {
  buildCommuteSchedule,
  CommuteScheduleInputError,
  parseCommuteScheduleInput,
} from "@/lib/route/schedule";
import type { CommuteScheduleInput } from "@/lib/types/contract";

const input: CommuteScheduleInput = {
  apartmentId: "listing-bluebird",
  selectedPlaces: [
    { id: "coffee-1", label: "Ada Coffee", kind: "coffee", lat: 47.61, lng: -122.33 },
    { id: "gym-1", label: "Capitol Hill Gym", kind: "gym", lat: 47.615, lng: -122.32 },
  ],
};

describe("parseCommuteScheduleInput", () => {
  it("accepts complete selected RoutePoi place objects", () => {
    expect(parseCommuteScheduleInput(input)).toEqual(input);
  });

  it("rejects missing apartment ids and malformed selections", () => {
    expect(() => parseCommuteScheduleInput({ apartmentId: "", selectedPlaces: [] })).toThrow(
      new CommuteScheduleInputError("invalid_apartment_id"),
    );
    expect(() => parseCommuteScheduleInput({ apartmentId: "a", selectedPlaces: "coffee-1" })).toThrow(
      new CommuteScheduleInputError("invalid_selected_places"),
    );
    expect(() =>
      parseCommuteScheduleInput({
        apartmentId: "a",
        selectedPlaces: [{ id: "coffee-1", label: "Ada Coffee", kind: "coffee", lat: Number.NaN, lng: -122.33 }],
      }),
    ).toThrow(new CommuteScheduleInputError("invalid_selected_place"));
    expect(() =>
      parseCommuteScheduleInput({
        apartmentId: "a",
        selectedPlaces: [{ id: "coffee-1", label: "Ada Coffee", kind: "coffee", lat: 91, lng: -122.33 }],
      }),
    ).toThrow(new CommuteScheduleInputError("invalid_selected_place"));
  });
});

describe("buildCommuteSchedule", () => {
  it("is deterministic for identical apartment and place selections", () => {
    expect(buildCommuteSchedule(input)).toEqual(buildCommuteSchedule(input));
  });

  it("incorporates selected places with coordinates and ordering", () => {
    const day = buildCommuteSchedule(input);

    expect(day).toEqual({
      date: "2026-06-12",
      dayLabel: "Commute day",
      items: [
        {
          time: "08:00",
          title: "Leave your selected apartment",
          kind: "settle",
          note: "Start from apartment listing-bluebird; keep the morning commute simple before adding stops.",
        },
        {
          time: "08:30",
          title: "Commute stop: Ada Coffee",
          kind: "explore",
          lat: 47.61,
          lng: -122.33,
          note: "Ada Coffee is built into the commute as a coffee stop, using the place selected from the route results.",
        },
        {
          time: "09:00",
          title: "Commute stop: Capitol Hill Gym",
          kind: "explore",
          lat: 47.615,
          lng: -122.32,
          note: "Capitol Hill Gym is built into the commute as a gym stop, using the place selected from the route results.",
        },
        {
          time: "09:30",
          title: "Arrive near the office",
          kind: "errand",
          note: "The day keeps your selected route stops in order before work.",
        },
      ],
    });
  });
});
