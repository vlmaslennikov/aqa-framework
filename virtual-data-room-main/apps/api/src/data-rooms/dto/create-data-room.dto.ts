import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDataRoomDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter a data room name' })
  @MaxLength(200)
  name!: string;
}
