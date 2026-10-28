export interface Iposts {
  _id: string;
  body?: string;
  image?: string;
  privacy: string;
  user: IPostUser;
  sharedPost: ISharedPostReference | string | null;
  likes: string[];
  createdAt: string;
  commentsCount: number;
  topComment: IPostComment | null;
  sharesCount: number;
  likesCount: number;
  isShare: boolean;
  id: string;
  bookmarked: boolean;
}

export interface ISharedPostReference {
  _id?: string;
  id?: string;
  body?: string;
  image?: string;
  privacy?: string;
  user?: IPostUser;
  createdAt?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
}

export interface IPostComment {
  _id: string;
  content: string;
  image?: string;
  commentCreator: IPostUser;
  post: string;
  parentComment: null;
  likes: unknown[];
  createdAt: string;
}

export interface IPostUser {
  _id: string;
  name: string;
  username: string;
  photo: string;
}