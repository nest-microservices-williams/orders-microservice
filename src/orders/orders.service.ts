import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomRpcException } from 'src/common/exceptions/rpc.exception';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { buildPagination } from 'src/helpers/pagination.helper';
import { PRODUCT_SERVICE } from 'src/config/services';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { Product } from './interfaces';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const productsIds = createOrderDto.items.map(
      (product) => product.productId,
    );

    const productsObservable = this.productClient
      .send({ cmd: 'validate_products' }, productsIds)
      .pipe(
        catchError((error) => {
          throw new CustomRpcException(error);
        }),
      );

    const products = await firstValueFrom<Product[]>(productsObservable);

    return products;
    // return this.prismaService.order.create({ data: createOrderDto });
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page, limit, status } = orderPaginationDto;

    const ordersPromise = this.prismaService.order.findMany({
      where: { status },
      take: limit,
      skip: (page - 1) * limit,
    });

    const totalPromise = this.prismaService.order.count({ where: { status } });

    const [orders, total] = await this.prismaService.$transaction([
      ordersPromise,
      totalPromise,
    ]);

    return buildPagination(orders, total, page, limit);
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

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) return order;

    return this.prismaService.order.update({
      where: { id },
      data: { status },
    });
  }
}
