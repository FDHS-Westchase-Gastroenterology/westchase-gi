/* Ported from src/app/design/brand/card.tsx. Card is adopted as generated —
   the shadcn semantic bridge paints it in paper/line/navy. */

import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
} from "westchase-gi";

export function Default() {
  return (
    <Card className="w-full max-w-sm">
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
  );
}

export function Compact() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="border-b">
        <CardTitle>Westchase office</CardTitle>
        <CardDescription>Mon–Fri, 8 am–5 pm</CardDescription>
      </CardHeader>
      <CardContent>
        <p>A real person answers the phone during office hours.</p>
      </CardContent>
    </Card>
  );
}

export function SignIn() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Staff sign-in</CardTitle>
        <CardDescription>Use your practice email.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="card-email">Email</FieldLabel>
            <Input id="card-email" type="email" placeholder="you@westchasegi.com" />
          </Field>
          <Field>
            <FieldLabel htmlFor="card-password">Password</FieldLabel>
            <Input id="card-password" type="password" />
          </Field>
        </FieldGroup>
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
  );
}
