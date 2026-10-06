import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, useAuth } from "../auth/AuthProvider";
import { keys } from "../api/queries";
import { createEventTracker } from "./events";
import type { EventInput } from "../types/domain";
type EventContext = {
  tracker: ReturnType<typeof createEventTracker>;
  send: (event: EventInput) => Promise<boolean>;
};
const Context = createContext<EventContext | null>(null);
const inactiveTracker = createEventTracker(async () => {});
export function EventProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { user } = useAuth();
  const record = useCallback(
    async (event: EventInput) => {
      const result = await api.event(event);
      client.setQueryData(keys.me, result.profile);
      if (event.type !== "impression")
        await client.invalidateQueries({
          queryKey: keys.feed,
          refetchType: "none",
        });
    },
    [client],
  );
  const sessionId = user?.uid;
  const tracker = useMemo(() => {
    void sessionId;
    return createEventTracker(record);
  }, [record, sessionId]);
  const send = useCallback(
    async (event: EventInput) => {
      try {
        await record(event);
        return true;
      } catch {
        return false;
      }
    },
    [record],
  );
  return (
    <Context.Provider value={{ tracker, send }}>{children}</Context.Provider>
  );
}
export const useEventTracker = () =>
  useContext(Context)?.tracker ?? inactiveTracker;
export const useEventAction = () =>
  useContext(Context)?.send ?? (async () => false);
