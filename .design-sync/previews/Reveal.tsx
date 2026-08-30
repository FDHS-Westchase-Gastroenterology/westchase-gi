/* Reveal is the scroll-entrance wrapper. Content is fully visible by default —
   the animation only applies when JS is available and motion is allowed — so a
   static card correctly shows the settled state. The stagger axis is `delay`
   (0–4), which is what the cells below demonstrate. */

import { Card, CardContent, CardHeader, CardTitle, Reveal } from "westchase-gi";

export function StaggeredCards() {
  const offices = [
    { title: "Westchase", body: "Mon–Fri, 8 am–5 pm" },
    { title: "Lutz", body: "Mon–Thu, 8 am–4 pm" },
    { title: "Telehealth", body: "By appointment" },
  ];
  return (
    <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
      {offices.map((o, i) => (
        <Reveal key={o.title} delay={(i + 1) as 1 | 2 | 3}>
          <Card>
            <CardHeader>
              <CardTitle>{o.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{o.body}</p>
            </CardContent>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}

export function Variants() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <Reveal variant="up" as="p" className="text-body">
        variant="up" — the default: rises into place.
      </Reveal>
      <Reveal variant="fade" as="p" className="text-body">
        variant="fade" — opacity only, no movement.
      </Reveal>
      <Reveal variant="right" as="p" className="text-body">
        variant="right" — enters from the inline start.
      </Reveal>
    </div>
  );
}
