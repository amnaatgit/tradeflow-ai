import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function EmptyState({
  title = "Nothing here yet",
  description = "This section is ready for the next phase of development.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This page is ready for the next phase of development.
        </p>
      </CardContent>
    </Card>
  );
}