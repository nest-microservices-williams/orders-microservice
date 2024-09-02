import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomRpcException } from 'src/common/exceptions/rpc.exception';

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createOrderDto: CreateOrderDto) {
    return this.prismaService.order.create({ data: createOrderDto });
  }

  findAll() {
    return `This action returns all orders`;
  }

  async findOne(id: string) {
    const order = await this.prismaService.order.findUnique({ where: { id } });

    if (!order) {
      throw new CustomRpcException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Order with id: ${id} not found`,
      });
    }

    return order;
  }
}
