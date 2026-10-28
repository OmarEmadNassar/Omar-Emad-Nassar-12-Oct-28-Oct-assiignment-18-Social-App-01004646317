export interface Icomments {
    _id: string;
    content:string;
    image?: string;
    commentCreator: CommentCreator;
    post: string;
    parentComment:null;
    likes:unknown[]
    createdAt:string;
    repliesCount?:number;

}
export interface CommentCreator {
    _id: string;
    name: string;
    username: string;
    photo: string;
}