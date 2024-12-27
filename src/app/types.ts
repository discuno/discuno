export interface Card {
  id: number;
  userImage?: string | null;
  name?: string | null;
  description?: string | null;
  createdById: string;
  graduationYear?: number | null;
  schoolYear?: string | null;
  school?: string | null;
  major?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface PostGridProps {
  posts: Card[];
  schoolId: number | null;
  majorId: number | null;
  graduationYear: number | null;
}
