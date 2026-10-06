import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../auth/AuthProvider";
import { keys, useMe } from "../api/queries";
import { ErrorState, Loading } from "../components/common";
import { locationLabel } from "../utils/presentation";
export function Location() {
  const client = useQueryClient();
  const profile = useMe();
  const query = useQuery({ queryKey: keys.locations, queryFn: api.locations });
  const mutation = useMutation({
    mutationFn: api.location,
    onSuccess: async (data) => {
      client.setQueryData(keys.me, data);
      await client.invalidateQueries({ queryKey: keys.feed });
    },
  });
  if (query.isPending || profile.isPending)
    return <Loading label="Buscando las regiones disponibles…" />;
  if (query.error || profile.error)
    return (
      <ErrorState
        error={query.error ?? profile.error}
        retry={() => {
          void query.refetch();
          void profile.refetch();
        }}
      />
    );
  return (
    <section className="location-page">
      <div className="page-heading">
        <div>
          <h1>
            Tu región<span className="red-dot">.</span>
          </h1>
          <p>Elige una región y descubre cómo cambia tu portada.</p>
        </div>
        <MapPin size={32} />
      </div>
      <p className="location-explanation">
        Esta ubicación es <strong>simulada</strong>. No usamos el GPS de tu
        teléfono. Tu actividad de lectura también ayuda a adaptar la selección,
        conservando perspectivas nacionales e internacionales.
      </p>
      <div className="location-options">
        {query.data.locations.map((location) => {
          const selected =
            profile.data?.simulatedLocation.country === location.country &&
            profile.data?.simulatedLocation.region === location.region;
          return (
            <button
              key={`${location.country}-${location.region ?? ""}`}
              className={`location-option ${selected ? "selected" : ""}`}
              disabled={mutation.isPending}
              aria-pressed={selected}
              onClick={() =>
                mutation.mutate({
                  country: location.country,
                  ...(location.region ? { region: location.region } : {}),
                })
              }
            >
              <div>
                <strong>{locationLabel(location)}</strong>
                <span>
                  {location.region ? "Región" : "País"} · {location.country}
                </span>
              </div>
              {selected ? <Check size={20} /> : <ArrowRight size={20} />}
            </button>
          );
        })}
      </div>
      {mutation.isPending && <p role="status">Actualizando tu portada…</p>}
      {mutation.isSuccess && (
        <p className="location-success" role="status">
          Ahora lees desde {locationLabel(mutation.data.simulatedLocation)}. La
          portada ya se ha actualizado.
        </p>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      <Link to="/feed" className="button">
        Abrir mi portada <ArrowRight size={17} />
      </Link>
    </section>
  );
}
