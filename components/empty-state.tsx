import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function EmptyState({
  title = "Nothing here yet",
  description = "Get started by creating an order or exploring the app.",
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
          No content yet. Start by creating something new.
        </p>
      </CardContent>
    </Card>
  );
}