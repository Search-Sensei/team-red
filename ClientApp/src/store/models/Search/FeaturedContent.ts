import { FeaturedContentType } from './FeaturedContentType';

export interface FeaturedContent {
  type: FeaturedContentType;
  position: string;
  title: string;
  content: string;
}
