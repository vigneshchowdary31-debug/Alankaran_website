import React from "react";
import { Helmet } from "react-helmet-async";

interface StructuredDataProps {
  data: Record<string, any> | Record<string, any>[];
}

export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
}
