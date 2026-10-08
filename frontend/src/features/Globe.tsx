import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { geoCentroid, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature as topojsonFeature } from "topojson-client";
import atlas from "@d3-maps/atlas/world/countries/countries-110m";
import type { AtlasFeatureProperties } from "@d3-maps/atlas/types";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import * as isoCountries from "i18n-iso-countries";
import spanishCountries from "i18n-iso-countries/langs/es.json";
import { ArrowLeft, CalendarDays, Minus, Plus, RotateCcw } from "lucide-react";
import { useGlobe, useMe } from "../api/queries";
import { Empty, ErrorState, Loading } from "../components/common";
import { Story } from "./Feed";
import demoNews from "./sample-news.json";
import type { Article, FeedItem, GlobeResponse } from "../types/domain";

isoCountries.registerLocale(spanishCountries);

const TIME_ZONE = "America/Guatemala";
const VIEW_SIZE = 360;
const MIN_ZOOM = 0.78;
const MAX_ZOOM = 2.6;
const DEFAULT_ZOOM = 1.08;
const MAX_COUNTRY_STORIES = 10;

type CountryProperties = AtlasFeatureProperties & { name: string };
type CountryFeature = Feature<Geometry, CountryProperties>;
type GlobeState = { rotation: [number, number]; zoom: number };
type GlobeNavigationState = { globeState?: GlobeState };
type PointerPoint = { x: number; y: number };
type DateParts = { year: number; month: number; day: number };

const worldFeatures = (
  topojsonFeature(atlas, atlas.objects.features) as FeatureCollection<
    Geometry,
    CountryProperties
  >
).features;

function localDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function dateKey({ year, month, day }: DateParts) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function partsFromKey(key: string): DateParts {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

function addCalendarDays(parts: DateParts, offset: number): DateParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + offset),
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function currentWeek(now = new Date()) {
  const today = localDateParts(now);
  const weekday = new Date(
    Date.UTC(today.year, today.month - 1, today.day),
  ).getUTCDay();
  const start = addCalendarDays(today, -weekday);
  const end = addCalendarDays(start, 7);
  return { today: dateKey(today), start: dateKey(start), end: dateKey(end) };
}

function rangeLabel(start: string, end: string) {
  const first = partsFromKey(start);
  const last = addCalendarDays(partsFromKey(end), -1);
  const formatter = new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const firstDate = new Date(
    Date.UTC(first.year, first.month - 1, first.day, 12),
  );
  const lastDate = new Date(Date.UTC(last.year, last.month - 1, last.day, 12));
  return `${formatter.format(firstDate)} – ${formatter.format(lastDate)}`;
}

function countryCodeFromFeature(country: CountryFeature) {
  return isoCountries.alpha3ToAlpha2(country.properties.id)?.toUpperCase();
}

function countryName(code: string, featureName?: string) {
  return isoCountries.getName(code, "es") ?? featureName ?? code;
}

function featureForCountry(code: string | undefined) {
  if (!code) return undefined;
  const alpha3 = isoCountries.alpha2ToAlpha3(code.toUpperCase());
  return worldFeatures.find((country) => country.properties.id === alpha3);
}

function centeredRotation(feature?: CountryFeature): [number, number] {
  if (!feature) return [-90, -15];
  const [longitude, latitude] = geoCentroid(feature);
  return [-longitude, -latitude];
}

function formatCountryCount(count: number) {
  return count === 1 ? "1 noticia" : `${count} noticias`;
}

function compareImportanceAndDate(left: FeedItem, right: FeedItem) {
  const priority =
    Number(right.article.editorialPriority === "high") -
    Number(left.article.editorialPriority === "high");
  if (priority) return priority;
  const leftDate = Date.parse(
    left.article.publishedAt ?? left.article.createdAt,
  );
  const rightDate = Date.parse(
    right.article.publishedAt ?? right.article.createdAt,
  );
  return (
    (Number.isNaN(rightDate) ? 0 : rightDate) -
    (Number.isNaN(leftDate) ? 0 : leftDate)
  );
}

function summarizeDemoItems(items: FeedItem[]): GlobeResponse["countries"] {
  const grouped = new Map<string, FeedItem[]>();
  for (const item of items) {
    for (const code of new Set(
      item.article.countries.map((value) => value.toUpperCase()),
    )) {
      const stories = grouped.get(code) ?? [];
      stories.push(item);
      grouped.set(code, stories);
    }
  }
  return Object.fromEntries(
    [...grouped.entries()].map(([code, stories]) => [
      code,
      {
        count: stories.length,
        items: stories
          .sort(compareImportanceAndDate)
          .slice(0, MAX_COUNTRY_STORIES),
      },
    ]),
  );
}

function summarizeDemoWorldStory(items: FeedItem[]): FeedItem | null {
  return (
    items
      .filter(({ article }) => article.scope === "international")
      .sort(compareImportanceAndDate)[0] ?? null
  );
}

function newsHeatColor(count: number) {
  if (count <= 0) return "#e7edf2";
  const ratio = Math.min(count, MAX_COUNTRY_STORIES) / MAX_COUNTRY_STORIES;
  const start = [248, 220, 215];
  const finish = [185, 55, 41];
  const color = start.map((value, index) =>
    Math.round(value + (finish[index] - value) * ratio),
  );
  return `rgb(${color.join(" ")})`;
}

function demoItemsForCurrentWeek(window: ReturnType<typeof currentWeek>) {
  const source = (demoNews as Article[]).filter(
    (article) => article.status === "published",
  );
  const start = partsFromKey(window.start);
  const today = partsFromKey(window.today);
  const throughToday = Math.max(
    0,
    Math.floor(
      (Date.UTC(today.year, today.month - 1, today.day) -
        Date.UTC(start.year, start.month - 1, start.day)) /
        86_400_000,
    ),
  );

  return source.map((article, index) => {
    const dayOffset = Math.min(index, throughToday);
    const publishedAt = new Date(
      Date.UTC(start.year, start.month - 1, start.day + dayOffset, 16),
    ).toISOString();
    return {
      article: { ...article, publishedAt, createdAt: publishedAt },
      reasons: [],
    };
  });
}

function clampZoom(zoom: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

function distanceBetween(first: PointerPoint, second: PointerPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function Globe({ preview = false }: { preview?: boolean }) {
  const globe = useGlobe(!preview);
  const profile = useMe(!preview);
  const location = useLocation();
  const navigate = useNavigate();
  const { countryCode: routeCountry } = useParams();
  const basePath = preview ? "/preview/globe" : "/globe";
  const countryCode = routeCountry?.toUpperCase();
  const initialState = (location.state as GlobeNavigationState | null)
    ?.globeState;
  const defaultCountry = preview
    ? "GT"
    : (profile.data?.simulatedLocation.country ?? "GT");
  const [rotation, setRotation] = useState<[number, number]>(
    () =>
      initialState?.rotation ??
      centeredRotation(featureForCountry(countryCode ?? defaultCountry)),
  );
  const [zoom, setZoom] = useState(() =>
    clampZoom(initialState?.zoom ?? DEFAULT_ZOOM),
  );
  const pointers = useRef(new Map<number, PointerPoint>());
  const dragStart = useRef<{
    point: PointerPoint;
    rotation: [number, number];
    countryCode?: string;
  } | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const didDrag = useRef(false);

  useEffect(() => {
    if (!preview && !countryCode && !initialState && profile.data) {
      setRotation(
        centeredRotation(
          featureForCountry(profile.data.simulatedLocation.country),
        ),
      );
    }
  }, [countryCode, initialState, preview, profile.data]);

  const [week, setWeek] = useState(() => currentWeek());
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setWeek((previous) => {
          const next = currentWeek();
          return previous.today === next.today ? previous : next;
        }),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const demoItems = useMemo(
    () => (preview ? demoItemsForCurrentWeek(week) : []),
    [preview, week],
  );
  const demoCountrySummaries = useMemo(
    () => summarizeDemoItems(demoItems),
    [demoItems],
  );
  const demoWorldStory = useMemo(
    () => summarizeDemoWorldStory(demoItems),
    [demoItems],
  );
  const worldStory = preview
    ? demoWorldStory
    : (globe.data?.worldStory ?? null);
  const countrySummaries = useMemo(
    () => (preview ? demoCountrySummaries : (globe.data?.countries ?? {})),
    [demoCountrySummaries, globe.data?.countries, preview],
  );
  const countryCounts = useMemo(
    () =>
      new Map(
        Object.entries(countrySummaries).map(([code, digest]) => [
          code.toUpperCase(),
          digest.count,
        ]),
      ),
    [countrySummaries],
  );
  const weekStart = preview
    ? week.start
    : (globe.data?.week.start ?? week.start);
  const weekEnd = preview ? week.end : (globe.data?.week.end ?? week.end);
  const selectedFeature = useMemo(
    () => featureForCountry(countryCode),
    [countryCode],
  );
  const selectedName = countryCode
    ? countryName(countryCode, selectedFeature?.properties.name)
    : "";
  const selectedDigest = countryCode
    ? countrySummaries[countryCode]
    : undefined;
  const selectedItems = selectedDigest?.items ?? [];
  const userCountry = defaultCountry.toUpperCase();

  const drawing = useMemo(() => {
    const projection = geoOrthographic()
      .translate([VIEW_SIZE / 2, VIEW_SIZE / 2])
      .scale(150 * zoom)
      .clipAngle(90)
      .precision(0.35)
      .rotate(rotation);
    const path = geoPath(projection);
    return {
      sphere: path({ type: "Sphere" }),
      graticule: path(geoGraticule10()),
      countries: worldFeatures.map((country) => ({
        feature: country,
        code: countryCodeFromFeature(country),
        d: path(country),
      })),
    };
  }, [rotation, zoom]);

  if (!preview && (globe.isPending || profile.isPending))
    return <Loading label="Cargando el mapa de noticias…" />;
  if (!preview && (globe.error || profile.error))
    return (
      <ErrorState
        error={globe.error ?? profile.error}
        retry={() => {
          void globe.refetch();
          void profile.refetch();
        }}
      />
    );

  const openCountry = (code: string) => {
    navigate(`${basePath}/${code.toLowerCase()}`, {
      state: { globeState: { rotation, zoom } satisfies GlobeState },
    });
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    const target = event.target;
    const tappedCountry =
      target instanceof Element
        ? target.closest<SVGPathElement>(".globe-country.has-news")?.dataset
            .countryCode
        : undefined;
    pointers.current.set(event.pointerId, point);
    didDrag.current = false;
    if (pointers.current.size === 1) {
      dragStart.current = {
        point,
        rotation: [...rotation],
        countryCode: tappedCountry,
      };
      pinchStart.current = null;
    } else if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinchStart.current = {
        distance: distanceBetween(first, second),
        zoom,
      };
      dragStart.current = null;
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size >= 2 && pinchStart.current) {
      const [first, second] = [...pointers.current.values()];
      const distance = distanceBetween(first, second);
      if (Math.abs(distance - pinchStart.current.distance) > 3)
        didDrag.current = true;
      setZoom(
        clampZoom(
          pinchStart.current.zoom * (distance / pinchStart.current.distance),
        ),
      );
      return;
    }
    if (!dragStart.current) return;
    const deltaX = point.x - dragStart.current.point.x;
    const deltaY = point.y - dragStart.current.point.y;
    if (Math.hypot(deltaX, deltaY) > 5) didDrag.current = true;
    setRotation([
      dragStart.current.rotation[0] + (deltaX / VIEW_SIZE) * 180,
      Math.max(
        -78,
        Math.min(
          78,
          dragStart.current.rotation[1] - (deltaY / VIEW_SIZE) * 150,
        ),
      ),
    ]);
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 1) {
      const [point] = pointers.current.values();
      dragStart.current = { point, rotation: [...rotation] };
      pinchStart.current = null;
    } else if (pointers.current.size === 0) {
      const tappedCountry =
        event.type === "pointerup" && !didDrag.current
          ? dragStart.current?.countryCode
          : undefined;
      dragStart.current = null;
      pinchStart.current = null;
      didDrag.current = false;
      if (tappedCountry) openCountry(tappedCountry);
    }
  };

  const handleCountryKey = (
    event: KeyboardEvent<SVGPathElement>,
    code?: string,
  ) => {
    if (!code || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openCountry(code);
  };

  return (
    <div
      className={`feed-content globe-page${countryCode ? " globe-country-page" : ""}`}
    >
      {countryCode ? (
        <>
          <button
            type="button"
            className="globe-back"
            onClick={() =>
              navigate(basePath, {
                state: {
                  globeState: { rotation, zoom } satisfies GlobeState,
                },
              })
            }
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Volver al globo</span>
          </button>
          <header className="globe-country-heading">
            <p className="globe-kicker">Noticias por país · semana actual</p>
            <h1>
              {selectedName}
              <span className="red-dot">.</span>
            </h1>
            <p>
              {formatCountryCount(selectedDigest?.count ?? 0)} ·{" "}
              {rangeLabel(weekStart, weekEnd)}
              {selectedItems.length === MAX_COUNTRY_STORIES &&
              (selectedDigest?.count ?? 0) > MAX_COUNTRY_STORIES
                ? " · selección de las 10 más importantes"
                : ""}
            </p>
          </header>
          {selectedItems.length ? (
            <section
              className="globe-news-list"
              aria-label={`Noticias de ${selectedName}`}
            >
              {selectedItems.map((item) => (
                <div
                  className={`globe-news-item${item.article.editorialPriority === "high" ? " is-priority" : ""}`}
                  key={item.article.id}
                >
                  {item.article.editorialPriority === "high" && (
                    <span className="globe-priority-label">
                      Prioridad editorial
                    </span>
                  )}
                  <Story
                    item={item}
                    variant="compact"
                    preview={preview}
                    country={countryCode}
                  />
                </div>
              ))}
            </section>
          ) : (
            <Empty title={`Aún no hay noticias de ${selectedName}`}>
              En esta semana no hay noticias publicadas para este país. Puedes
              volver al globo y explorar otro.
            </Empty>
          )}
        </>
      ) : (
        <>
          <header className="globe-heading">
            <div>
              <p className="globe-kicker">Edición mundial</p>
              <h1>
                Mapa de noticias<span className="red-dot">.</span>
              </h1>
              <p className="globe-intro">
                Explora el mundo y abre la selección semanal de cada país.
              </p>
            </div>
            <div className="globe-week-chip">
              <CalendarDays size={15} aria-hidden="true" />
              <span>{rangeLabel(weekStart, weekEnd)}</span>
            </div>
          </header>

          <section
            className="globe-map-section"
            aria-label="Globo interactivo de noticias"
          >
            <div className="globe-map-frame">
              <div className="globe-map-glow" aria-hidden="true" />
              <svg
                className="globe-map-svg"
                viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
                role="group"
                aria-label="Globo interactivo: arrastra para girar, pellizca o usa la rueda para acercar; toca un país con noticias para abrirlo."
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onWheel={(event) => {
                  event.preventDefault();
                  setZoom((value) =>
                    clampZoom(value * Math.exp(-event.deltaY * 0.001)),
                  );
                }}
              >
                <defs>
                  <radialGradient id="globe-ocean" cx="35%" cy="28%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#dce5ed" />
                  </radialGradient>
                  <clipPath id="globe-sphere-clip">
                    <path d={drawing.sphere ?? undefined} />
                  </clipPath>
                  <filter
                    id="globe-shadow"
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="12"
                      stdDeviation="12"
                      floodColor="#10243a"
                      floodOpacity="0.18"
                    />
                  </filter>
                </defs>
                <path
                  d={drawing.sphere ?? undefined}
                  className="globe-ocean"
                  fill="url(#globe-ocean)"
                  filter="url(#globe-shadow)"
                />
                <g clipPath="url(#globe-sphere-clip)">
                  <path
                    d={drawing.graticule ?? undefined}
                    className="globe-graticule"
                  />
                  {drawing.countries.map(({ feature, code, d }) => {
                    if (!d || !code) return null;
                    const count = countryCounts.get(code) ?? 0;
                    const name = countryName(code, feature.properties.name);
                    const isClickable = count > 0;
                    return (
                      <path
                        key={feature.properties.id}
                        d={d}
                        className={`globe-country${count ? " has-news" : ""}`}
                        data-country-code={isClickable ? code : undefined}
                        fill={newsHeatColor(count)}
                        role={isClickable ? "button" : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        aria-hidden={isClickable ? undefined : true}
                        aria-label={
                          isClickable
                            ? `${name}: ${count > MAX_COUNTRY_STORIES ? "10 o más" : count} noticias esta semana. Abrir noticias.`
                            : undefined
                        }
                        onKeyDown={
                          isClickable
                            ? (event) => handleCountryKey(event, code)
                            : undefined
                        }
                      />
                    );
                  })}
                </g>
              </svg>
              <div
                className="globe-zoom-controls"
                aria-label="Controles de zoom"
              >
                <button
                  type="button"
                  aria-label="Alejar globo"
                  title="Alejar"
                  onClick={() => setZoom((value) => clampZoom(value - 0.18))}
                  disabled={zoom <= MIN_ZOOM}
                >
                  <Minus size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Acercar globo"
                  title="Acercar"
                  onClick={() => setZoom((value) => clampZoom(value + 0.18))}
                  disabled={zoom >= MAX_ZOOM}
                >
                  <Plus size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Restablecer vista del globo"
                  title="Restablecer vista"
                  onClick={() => {
                    setRotation(
                      centeredRotation(featureForCountry(userCountry)),
                    );
                    setZoom(DEFAULT_ZOOM);
                  }}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            <div className="globe-map-caption">
              <span>
                Arrastra para girar · pellizca o desplaza para acercar · los
                países con color tienen noticias
              </span>
              <div
                className="globe-legend"
                aria-label="Intensidad: de cero a diez o más noticias"
              >
                <span>0</span>
                <span className="globe-legend-ramp" aria-hidden="true" />
                <span>10+</span>
              </div>
            </div>
          </section>

          <section
            className="globe-weekly-story"
            aria-labelledby="globe-weekly-story-heading"
          >
            <div className="globe-weekly-story-heading">
              <p className="globe-kicker">
                Selección editorial · {rangeLabel(weekStart, weekEnd)}
              </p>
              <h2 id="globe-weekly-story-heading">
                Noticia mundial de la semana<span className="red-dot">.</span>
              </h2>
            </div>
            {worldStory ? (
              <div
                className={`globe-weekly-story-card${worldStory.article.editorialPriority === "high" ? " is-priority" : ""}`}
              >
                {worldStory.article.editorialPriority === "high" && (
                  <span className="globe-priority-label">
                    Prioridad editorial
                  </span>
                )}
                <Story
                  item={worldStory}
                  variant="compact"
                  preview={preview}
                  country={userCountry}
                />
              </div>
            ) : (
              <div className="globe-weekly-story-empty">
                Aún no hay noticias internacionales publicadas esta semana.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
