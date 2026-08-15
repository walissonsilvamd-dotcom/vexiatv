import { createServerFn } from "@tanstack/react-start";
import { fetchFootballScores, fetchGameDetails } from "./espn.server";

export type { EspnGame } from "./espn-types";

export const getEspnGameDetails = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const id = (data as { id?: unknown })?.id;
    return { id: typeof id === "string" ? id : "" };
  })
  .handler(async ({ data }) => {
    if (!data.id) return null;
    return await fetchGameDetails(data.id);
  });

export const getLiveFootballScores = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const raw = (data as { date?: unknown })?.date;
    const date = typeof raw === "string" ? raw.replace(/-/g, "") : "";
    return { date };
  })
  .handler(async ({ data }) => {
    const dateParam =
      data.date || new Date().toISOString().split("T")[0].replace(/-/g, "");
    try {
      return await fetchFootballScores(dateParam);
    } catch {
      return { events: [] };
    }
  });
