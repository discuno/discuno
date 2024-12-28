export interface Card {
  id: number | undefined;
  userImage?: string | null;
  name?: string | null;
  description?: string | null;
  createdById: string | undefined;
  graduationYear?: number | null;
  schoolYear?: string | null;
  school?: string | null;
  major?: string | null;
  createdAt: Date | undefined;
  updatedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface PostGridProps {
  posts: Card[];
  schoolId: number | null;
  majorId: number | null;
  graduationYear: number | null;
}
