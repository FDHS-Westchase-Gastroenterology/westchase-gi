/* ChartContainer is the chart root: it supplies the config, the CSS variables each series reads (--color-<key>), and the responsive box.

   The registry's chart parts only render inside a ChartContainer, so each is
   previewed in the composition it belongs to (design-sync: compose
   context-required pieces inside their parent). Data is procedure volume for
   a plausible GI practice quarter. */

// recharts comes from the BUNDLE, not node_modules: importing it directly
// pulls a second copy into this preview and ChartContainer's
// ResponsiveContainer then renders an empty box (see preview-data.ts).
import { RcBar as Bar, RcBarChart as BarChart, RcCartesianGrid as CartesianGrid, RcXAxis as XAxis } from "westchase-gi";
import {
  StockCard as Card,
  StockCardContent as CardContent,
  StockCardDescription as CardDescription,
  StockCardHeader as CardHeader,
  StockCardTitle as CardTitle,
  StockChartContainer as ChartContainer,
  StockChartLegend as ChartLegend,
  StockChartLegendContent as ChartLegendContent,
  StockChartTooltip as ChartTooltip,
  StockChartTooltipContent as ChartTooltipContent,
} from "westchase-gi";

const data = [
  { month: "January", colonoscopy: 128, upper: 74 },
  { month: "February", colonoscopy: 141, upper: 69 },
  { month: "March", colonoscopy: 155, upper: 81 },
  { month: "April", colonoscopy: 133, upper: 77 },
  { month: "May", colonoscopy: 162, upper: 88 },
  { month: "June", colonoscopy: 149, upper: 72 },
];

const config = {
  colonoscopy: { label: "Colonoscopy", color: "var(--chart-1)" },
  upper: { label: "Upper endoscopy", color: "var(--chart-2)" },
};

export function InAPracticeDashboard() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Procedures by month</CardTitle>
        <CardDescription>January – June, both offices</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[240px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(v) => v.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="colonoscopy" fill="var(--color-colonoscopy)" radius={4} />
            <Bar dataKey="upper" fill="var(--color-upper)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
