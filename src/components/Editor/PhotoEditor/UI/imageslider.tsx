import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { UseEmblaCarouselType } from "embla-carousel-react";

interface photoObject {
  url: string;
  name: string;
  fullPath: string;
}

interface CarouselDemoProps {
  photos: photoObject[];
  setCurrentIndex: (value: number) => void;
  currentIndex: number;
}

const CarouselDemo: React.FC<CarouselDemoProps> = ({
  photos,
  setCurrentIndex,
  currentIndex,
}) => {
  const [api, setApi] = React.useState<CarouselApi>();

  React.useEffect(() => {
    console.log("Current Index:", currentIndex);
  }, [currentIndex]);

  return (
    <Carousel className="w-full max-w-sm" setApi={setApi}>
      <CarouselContent>
        {photos.map((image, index) => (
          <CarouselItem key={index}>
            <p className="flex dark:text-white justify-center item-center">
              {image.name}
            </p>
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-1">
                  <img
                    src={image.url}
                    alt={`Image ${index + 1}`}
                    style={{
                      objectFit: "contain",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        className="dark:text-black dark:bg-slate-100"
        onClick={() => {
          api?.scrollPrev();
          setCurrentIndex(currentIndex - 1);
        }}
      />
      <CarouselNext
        className="dark:text-black dark:bg-slate-100"
        onClick={() => {
          api?.scrollNext();
          setCurrentIndex(currentIndex + 1);
        }}
      />
    </Carousel>
  );
};
export default CarouselDemo;
