import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ErrorMessage } from "@/components/shared/ErrorMessage"

const formSchema = z.object({
  content: z.string().min(1, "Comment is required").max(5000, "Comment is too long"),
})

type CommentFormData = z.infer<typeof formSchema>

export function CommentForm({ slug, postNumber }: { slug: string; postNumber: string }) {
  const createCommentMutation = api.mutations.useCreateComment()

  const form = useForm<CommentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  })

  const contentValue = useWatch({ control: form.control, name: "content" })

  const onSubmit = (data: CommentFormData) => {
    createCommentMutation.mutate(
      {
        slug,
        postNumber,
        content: data.content.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Comment added successfully!")
          form.reset()
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add a Comment</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Share your thoughts..."
                      rows={3}
                      disabled={createCommentMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {createCommentMutation.error && <ErrorMessage error={createCommentMutation.error} />}
            <Button type="submit" disabled={createCommentMutation.isPending || !contentValue.trim()}>
              {createCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Comment
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
