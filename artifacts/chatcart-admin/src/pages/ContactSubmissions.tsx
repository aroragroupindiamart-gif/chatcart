import React from 'react';
import { Layout } from '@/components/Layout';
import { useContactSubmissions } from '@/hooks/useAdminApi';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail } from 'lucide-react';

export default function ContactSubmissions() {
  const { data: submissions, isLoading } = useContactSubmissions();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Submissions</h1>
          <p className="text-muted-foreground text-sm">Messages received from the marketing site.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : submissions?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Mail className="w-8 h-8 mx-auto mb-3 opacity-20" />
                No contact submissions found.
              </CardContent>
            </Card>
          ) : (
            submissions?.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{sub.name}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        {sub.email && <span>{sub.email}</span>}
                        {sub.phone && <span>{sub.phone}</span>}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-md text-sm whitespace-pre-wrap">
                    {sub.message}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
