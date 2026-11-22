/** Skeleton padrão das telas do app enquanto os dados carregam. */
export default function Loading() {
  return (
    <div className="page" role="status" aria-label="Carregando">
      <div className="skeleton h-9 w-40 mt-1.5" />
      <div className="skeleton h-[150px]" />
      <div className="skeleton h-[92px]" />
      <div className="skeleton h-[92px]" />
      <div className="skeleton h-[92px]" />
    </div>
  );
}
