import { useQuery } from "@tanstack/react-query";
import { api } from "../auth/AuthProvider";
export const keys = {
  me: ["me"],
  feed: ["feed"],
  globe: ["globe"],
  locations: ["locations"],
  adminNews: ["admin", "news"],
  mySubmissions: ["me", "submissions"],
  adminSubmissions: (filters: Record<string, string>) => [
    "admin",
    "submissions",
    filters,
  ],
  article: (id: string) => ["news", id],
  adminArticle: (id: string) => ["admin", "news", id],
  audit: (id?: string) => ["admin", "audit", id ?? "all"],
  usage: ["admin", "usage"],
};
export const useMe = (enabled = true) =>
  useQuery({ queryKey: keys.me, queryFn: api.me, enabled });
export const useFeed = (enabled = true) =>
  useQuery({ queryKey: keys.feed, queryFn: api.feed, enabled });
export const useGlobe = (enabled = true) =>
  useQuery({ queryKey: keys.globe, queryFn: api.globe, enabled });
export const useAdminNews = () =>
  useQuery({ queryKey: keys.adminNews, queryFn: api.adminNews });
export const useMySubmissions = (enabled = true) =>
  useQuery({
    queryKey: keys.mySubmissions,
    queryFn: api.mySubmissions,
    enabled,
  });
