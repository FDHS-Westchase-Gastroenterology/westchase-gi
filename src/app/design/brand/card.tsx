import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { Example, ExampleWrapper } from "./example";

/* Card is adopted as generated: the bridge paints it (paper, line, navy)
   and the brand card surfaces (.card, .card-lined in globals.css) are the
   next extraction into this recipe. */

export default function BrandCardExample() {
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader>
            <CardTitle>Colonoscopy prep</CardTitle>
            <CardDescription>Start the clear-liquid diet the day before.</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm">
                Print
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>Download the instructions for your procedure and bring the sheet with you.</p>
          </CardContent>
          <CardFooter>
            <Button variant="amber" className="w-full">
              Download prep instructions
            </Button>
          </CardFooter>
        </Card>
      </Example>
      <Example title="Small">
        <Card size="sm" className="mx-auto w-full max-w-sm">
          <CardHeader className="border-b">
            <CardTitle>Lutz office</CardTitle>
            <CardDescription>Mon–Fri, 8 am–5 pm</CardDescription>
          </CardHeader>
          <CardContent>
            <p>A real person answers the phone during office hours.</p>
          </CardContent>
        </Card>
      </Example>
      <Example title="Sign in">
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader>
            <CardTitle>Staff sign-in</CardTitle>
            <CardDescription>Use your practice email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="brand-card-email">Email</FieldLabel>
                  <Input id="brand-card-email" type="email" placeholder="you@westchasegi.com" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="brand-card-password">Password</FieldLabel>
                  <Input id="brand-card-password" type="password" />
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" motion="commit" className="w-full">
              Sign in
            </Button>
            <Button variant="link" size="sm">
              Forgot your password?
            </Button>
          </CardFooter>
        </Card>
      </Example>
    </ExampleWrapper>
  );
}
