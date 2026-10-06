import { useQuery } from "@tanstack/react-query";
import { api } from "../auth/AuthProvider";
export const keys = {
  me: ["me"],
  feed: ["feed"],
  locations: ["locations"],
  adminNews: ["admin", "news"],
  article: (id: string) => ["news", id],
  adminArticle: (id: string) => ["admin", "news", id],
  audit: (id?: string) => ["admin", "audit", id ?? "all"],
  usage: ["admin", "usage"],
};
export const useMe = () => useQuery({ queryKey: keys.me, queryFn: api.me });
export const useFeed = () =>
  useQuery({ queryKey: keys.feed, queryFn: api.feed });
export const useAdminNews = () =>
  useQuery({ queryKey: keys.adminNews, queryFn: api.adminNews });
